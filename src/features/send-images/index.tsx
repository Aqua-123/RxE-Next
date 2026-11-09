import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { uploadImage } from "./hosts";
import { AttachButton, ImageDialog, openImageDialog, type SendRoute } from "./ImageDialog";
import { recordUpload, uploadsLeft, waitBeforeUpload } from "./limits";
import { MAX_UPLOAD_BYTES, prepareImage } from "./prepare";

const minutes = (ms: number) => Math.ceil(ms / 60_000);

export default defineFeature({
  id: "send-images",
  name: "Send images",
  description:
    "Adds an image button to every chat, and lets you paste or drop images. Gold users send with the site's own upload where it has one; otherwise images go to sxcu.net and show for RxE users.",
  category: "chat",
  settings: {
    imgurClientId: setting.text({
      label: "Imgur client ID",
      description:
        "Optional. Upload to Imgur with your own app key (api.imgur.com/oauth2/addclient). Without one, images go to sxcu.net.",
      placeholder: "e.g. 1a2b3c4d5e6f7a8",
      default: "",
    }),
  },
  setup({ composer, site, settings, ui }) {
    const routeFor = (): SendRoute =>
      site.currentUser()?.isGold && composer.hasSiteUpload() ? "gold" : "host";
    const open = (file: File) => openImageDialog(file, routeFor());

    async function send(file: File, route: SendRoute): Promise<void> {
      if (route === "gold") {
        if (!composer.sendWithSiteUpload(file)) throw new Error("This chat can't send images.");
        return;
      }
      const wait = waitBeforeUpload();
      if (wait > 0) throw new Error(`Upload limit reached. Try again in ${minutes(wait)} min.`);
      const prepared = await prepareImage(file);
      if (prepared.size > MAX_UPLOAD_BYTES) throw new Error("Images can be up to 8 MB.");
      const { url } = await uploadImage(prepared, settings.get().imgurClientId);
      recordUpload();
      if (!composer.send(url)) throw new Error("Uploaded, but the chat box isn't available.");
    }

    ui.overlay(<ImageDialog onSend={send} uploadsLeft={uploadsLeft} />);
    composer.addButton(() => <AttachButton onFile={open} />);
    composer.onFiles(([file]) => file && open(file));
  },
});
