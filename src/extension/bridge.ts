import {
  BRIDGE_REPLY,
  BRIDGE_SOURCE,
  type BridgeMessage,
  type BridgeResponse,
  type PageMessage,
} from "./protocol";

/** Isolated-world content script: relays the page's requests to the background worker. */

declare const chrome: {
  runtime: { sendMessage(message: unknown): Promise<unknown> };
};

function reply(message: BridgeMessage): void {
  window.postMessage(message, location.origin);
}

window.addEventListener("message", (event: MessageEvent<PageMessage>) => {
  if (event.source !== window || event.data?.source !== BRIDGE_SOURCE) return;
  const message = event.data;
  if (message.kind === "ping") {
    reply({ source: BRIDGE_REPLY, kind: "pong", id: message.id });
    return;
  }
  chrome.runtime
    .sendMessage({ kind: "fetch", request: message.request })
    .then((result) => {
      const { response, error } = result as { response?: BridgeResponse; error?: string };
      if (response) reply({ source: BRIDGE_REPLY, kind: "response", id: message.id, response });
      else reply({ source: BRIDGE_REPLY, kind: "error", id: message.id, message: String(error) });
    })
    .catch((error: unknown) =>
      reply({ source: BRIDGE_REPLY, kind: "error", id: message.id, message: String(error) })
    );
});
