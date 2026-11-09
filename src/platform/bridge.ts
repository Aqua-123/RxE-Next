import {
  BRIDGE_REPLY,
  BRIDGE_SOURCE,
  type BridgeMessage,
  type BridgeRequest,
  type BridgeResponse,
} from "@/extension/protocol";

/**
 * Cross-origin requests from the page world, relayed by the extension's background
 * worker. Unavailable in the userscript, where there is no extension.
 */

let nextId = 0;
const pending = new Map<number, (message: BridgeMessage) => void>();
let listening = false;

function listen(): void {
  if (listening) return;
  listening = true;
  window.addEventListener("message", (event: MessageEvent<BridgeMessage>) => {
    if (event.source !== window || event.data?.source !== BRIDGE_REPLY) return;
    pending.get(event.data.id)?.(event.data);
  });
}

type Ask = { kind: "ping" } | { kind: "fetch"; request: BridgeRequest };

function ask(message: Ask, timeoutMs: number) {
  listen();
  const id = ++nextId;
  return new Promise<BridgeMessage>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("RxE's extension didn't answer."));
    }, timeoutMs);
    pending.set(id, (reply) => {
      clearTimeout(timer);
      pending.delete(id);
      resolve(reply);
    });
    window.postMessage({ ...message, id, source: BRIDGE_SOURCE }, location.origin);
  });
}

let available: Promise<boolean> | undefined;

/** Whether the extension's bridge is there; the userscript has none. */
export function bridgeAvailable(): Promise<boolean> {
  available ??= ask({ kind: "ping" }, 1000).then(
    (reply) => reply.kind === "pong",
    () => false
  );
  return available;
}

export async function bridgeFetch(request: BridgeRequest): Promise<BridgeResponse> {
  const reply = await ask({ kind: "fetch", request }, 120_000);
  if (reply.kind === "response") return reply.response;
  throw new Error(
    reply.kind === "error" ? reply.message : "Unexpected reply from RxE's extension."
  );
}
