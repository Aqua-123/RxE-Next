import { defineFeature } from "@/core/feature";
import { drop } from "@/site/surfaces/chat";

export default defineFeature({
  id: "hide-typing",
  name: "Hide my typing",
  description: "Others don't see “is typing...” while you write.",
  category: "chat",
  enabledByDefault: false,
  setup({ chat }) {
    chat.outgoing((event) => (event.kind === "typing" ? drop : undefined));
  },
});
