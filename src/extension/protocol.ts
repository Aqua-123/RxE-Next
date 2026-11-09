/**
 * RxE runs in the page's world (it has to, to patch the site), where cross-origin
 * requests are bound by CORS. The extension relays requests to its background
 * worker, which has host permissions, through an isolated-world content script:
 *
 *   page (rxe.js) ⇄ window.postMessage ⇄ bridge.js ⇄ runtime message ⇄ background.js
 */

export const BRIDGE_SOURCE = "rxe-next";
export const BRIDGE_REPLY = "rxe-next-bridge";

/** Only these endpoints are reachable through the bridge, whatever a page script asks for. */
export const BRIDGE_HOSTS = ["https://catbox.moe/user/api.php"] as const;

export type FormPart =
  | { name: string; value: string }
  | { name: string; dataUrl: string; filename: string };

export interface BridgeRequest {
  url: string;
  method: "POST";
  form: FormPart[];
}

export interface BridgeResponse {
  status: number;
  text: string;
}

export type PageMessage =
  | { source: typeof BRIDGE_SOURCE; kind: "ping"; id: number }
  | { source: typeof BRIDGE_SOURCE; kind: "fetch"; id: number; request: BridgeRequest };

export type BridgeMessage =
  | { source: typeof BRIDGE_REPLY; kind: "pong"; id: number }
  | { source: typeof BRIDGE_REPLY; kind: "response"; id: number; response: BridgeResponse }
  | { source: typeof BRIDGE_REPLY; kind: "error"; id: number; message: string };

export function isAllowed(request: BridgeRequest): boolean {
  return (BRIDGE_HOSTS as readonly string[]).includes(request.url) && request.method === "POST";
}
