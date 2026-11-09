import { bridgeAvailable, bridgeFetch } from "@/platform/bridge";

export interface Uploaded {
  url: string;
  host: "sxcu" | "imgur" | "catbox";
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Couldn't read this image."));
    reader.readAsDataURL(file);
  });
}

/**
 * sxcu.net takes anonymous uploads straight from the page (it allows any origin),
 * so it works in the extension and the userscript with nothing to set up.
 * `noembed` makes it return the direct image link rather than its viewer page.
 */
async function sxcu(file: File): Promise<Uploaded> {
  const form = new FormData();
  form.append("file", file);
  form.append("noembed", "true");
  const response = await fetch("https://sxcu.net/api/files/create", { method: "POST", body: form });
  const body = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  const url = body?.url;
  if (!response.ok || !url || !/^https:\/\/sxcu\.net\/\w+\.\w+$/.test(url)) {
    throw new Error(`sxcu.net: ${body?.error ?? response.status}`);
  }
  return { url, host: "sxcu" };
}

/** Imgur needs an app key; the one the old RxE shipped with has been revoked. */
async function imgur(file: File, clientId: string): Promise<Uploaded> {
  const form = new FormData();
  form.append("image", file);
  form.append("type", "file");
  const response = await fetch("https://api.imgur.com/3/image", {
    method: "POST",
    headers: { Authorization: `Client-ID ${clientId}` },
    body: form,
  });
  const body = (await response.json().catch(() => null)) as {
    data?: { link?: string; error?: string };
  } | null;
  const link = body?.data?.link;
  if (!response.ok || !link) throw new Error(`Imgur: ${body?.data?.error ?? response.status}`);
  return { url: link, host: "imgur" };
}

/** catbox.moe needs no account, but doesn't allow requests from web pages, so the extension uploads. */
async function catbox(file: File): Promise<Uploaded> {
  if (!(await bridgeAvailable())) {
    throw new Error("Uploading to catbox.moe needs the RxE browser extension.");
  }
  const response = await bridgeFetch({
    url: "https://catbox.moe/user/api.php",
    method: "POST",
    form: [
      { name: "reqtype", value: "fileupload" },
      { name: "fileToUpload", dataUrl: await readAsDataUrl(file), filename: file.name },
    ],
  });
  const url = response.text.trim();
  if (response.status !== 200 || !/^https:\/\/files\.catbox\.moe\/\w+\.\w+$/.test(url)) {
    throw new Error(`catbox.moe: ${url.slice(0, 120) || response.status}`);
  }
  return { url, host: "catbox" };
}

/**
 * Imgur when you've set a key, otherwise sxcu.net; catbox.moe (extension only) if
 * those fail. The first error is the one reported.
 */
export async function uploadImage(file: File, imgurClientId: string): Promise<Uploaded> {
  const clientId = imgurClientId.trim();
  const hosts = [
    ...(clientId ? [() => imgur(file, clientId)] : []),
    () => sxcu(file),
    () => catbox(file),
  ];
  let firstError: unknown;
  for (const upload of hosts) {
    try {
      return await upload();
    } catch (error) {
      firstError ??= error;
    }
  }
  throw firstError;
}
