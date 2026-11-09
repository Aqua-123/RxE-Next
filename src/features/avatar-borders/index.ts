import { defineFeature } from "@/core/feature";
import { setting } from "@/core/settings";
import { AVATAR_CLASSES } from "@/site/surfaces/messages";

const GENDERS = ["male", "female", "other"] as const;

/**
 * Drawn inside the avatar (an inset shadow on ::after, above the image) so scroll
 * containers can't clip it. Colors come from the theme's --rxe-gender-* tokens.
 */
function bordersCss(style: "ring" | "glow", width: number): string {
  const avatar = `.${AVATAR_CLASSES.root}`;
  const base = `${avatar}::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}`;
  const rings = GENDERS.map((gender) => {
    const color = `var(--rxe-gender-${gender})`;
    const shadow =
      style === "glow"
        ? `inset 0 0 ${width * 3}px ${width}px ${color}`
        : `inset 0 0 0 ${width}px ${color}`;
    return `${avatar}.${AVATAR_CLASSES.gender(gender)}::after{box-shadow:${shadow}}`;
  });
  return [`${avatar}{position:relative}`, base, ...rings].join("\n");
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
