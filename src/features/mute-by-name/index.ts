import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import type { User } from "@/site/model";
import { drop } from "@/site/surfaces/chat";

/** One case-insensitive pattern per line. Lines that aren't valid patterns are skipped. */
export function compilePatterns(source: string): RegExp[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      try {
        return [new RegExp(line, "i")];
      } catch {
        return [];
      }
    });
}

export default defineFeature({
  id: "mute-by-name",
  name: "Mute by name",
  description:
    "Hides messages and typing from anyone whose display name matches a pattern, including their earlier messages in group chat.",
  category: "chat",
  settings: {
    patterns: setting.text({
      label: "Patterns",
      description:
        "One regular expression per line, case-insensitive. ^bot matches names starting with bot.",
      placeholder: "^spam\nfree nitro",
      multiline: true,
      default: "",
    }),
  },
  setup({ chat, messages, settings }) {
    let patterns: RegExp[] = [];
    const matches = (user: User) => patterns.some((pattern) => pattern.test(user.name));

    settings.watch(({ patterns: source }) => {
      patterns = compilePatterns(source);
      messages.hideAuthorsWhere(matches);
    });
    chat.incoming((event) => {
      if (event.kind === "message" || event.kind === "typing") {
        if (matches(event.author)) return drop;
      }
      return undefined;
    });
  },
});
