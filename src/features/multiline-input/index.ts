import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";

export default defineFeature({
  id: "multiline-input",
  name: "Multi-line messages",
  description:
    "Shift+Enter starts a new line and the box grows as you type. Line breaks show for RxE users; others see them as spaces.",
  category: "chat",
  settings: {
    recall: setting.boolean({
      label: "↑ brings back your last message",
      description:
        "In an empty box, to fix a typo and send it again. The site can't edit sent messages.",
      default: true,
    }),
  },
  setup({ composer, messages, settings }) {
    composer.multiline();
    messages.showLineBreaks();

    let last = "";
    composer.onSent((typed) => {
      last = typed;
    });
    composer.onKeyDown(({ key, text, setText }) => {
      if (key !== "ArrowUp" || text !== "" || !last || !settings.get().recall) return false;
      setText(last);
      return true;
    });
  },
});
