import { defineFeature } from "@/core/feature";
import { COMMANDS, expandCommand } from "./commands";

const list = Object.keys(COMMANDS)
  .map((name) => `.${name}`)
  .join(", ");

export default defineFeature({
  id: "chat-commands",
  name: "Chat commands",
  description: `Start a message with ${list}. Text after the command is sent before it.`,
  category: "chat",
  setup({ composer }) {
    composer.transform((text) => expandCommand(text) ?? undefined);
  },
});
