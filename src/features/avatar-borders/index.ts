import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { AVATAR_CLASSES } from "@/site/surfaces/messages";

const GENDERS = ["male", "female", "other"] as const;

/** Colors come from the theme's --rxe-gender-* tokens, so every theme can restyle them. */
function bordersCss(style: "ring" | "glow", width: number): string {
  return GENDERS.map((gender) => {
    const color = `var(--rxe-gender-${gender})`;
    const shadow =
      style === "glow" ? `0 0 ${width * 3}px ${width}px ${color}` : `0 0 0 ${width}px ${color}`;
    return `.${AVATAR_CLASSES.root}.${AVATAR_CLASSES.gender(gender)}{box-shadow:${shadow};border-radius:9999px}`;
  }).join("\n");
}

export default defineFeature({
  id: "avatar-borders",
  name: "Avatar borders",
  description:
    "Rings avatars everywhere in the gender color of the user. Colors follow your theme.",
  category: "appearance",
  settings: {
    style: setting.select({
      label: "Style",
      options: [
        { value: "ring", label: "Ring" },
        { value: "glow", label: "Glow" },
      ],
      default: "ring",
    }),
    width: setting.number({ label: "Thickness", min: 1, max: 4, step: 1, unit: "px", default: 2 }),
  },
  setup({ ui, settings }) {
    settings.watch(({ style, width }) => ui.siteStyle("borders", bordersCss(style, width)));
  },
});
