import { type BridgeRequest, type BridgeResponse, isAllowed } from "./protocol";

/** Background worker: performs the requests the page can't make itself because of CORS. */

declare const chrome: {
  runtime: {
    onMessage: {
      addListener(
        listener: (
          message: { kind?: string; request?: BridgeRequest },
          sender: unknown,
          respond: (result: { response?: BridgeResponse; error?: string }) => void
        ) => boolean | undefined
      ): void;
    };
  };
};

async function perform(request: BridgeRequest): Promise<BridgeResponse> {
  const form = new FormData();
  for (const part of request.form) {
    if ("value" in part) form.append(part.name, part.value);
    else form.append(part.name, await (await fetch(part.dataUrl)).blob(), part.filename);
  }
  const response = await fetch(request.url, { method: request.method, body: form });
  return { status: response.status, text: await response.text() };
}

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message.kind !== "fetch" || !message.request) return undefined;
  if (!isAllowed(message.request)) {
    respond({ error: "This address isn't allowed." });
    return undefined;
  }
  perform(message.request)
    .then((response) => respond({ response }))
    .catch((error: unknown) => respond({ error: String(error) }));
  return true;
});
