import { defineFeature } from "@/core/feature";
import { applyTextStyles } from "./styles";

export default defineFeature({
  id: "text-styles",
  name: "Text styles",
  description:
    "Fancy letters everyone can see, even without RxE: ~smallcaps~, ^^superscript^^, ,,hooked,,, <cursive>, <<bold cursive>>, [[squared]], ((circled)) and {{medieval}}.",
  category: "chat",
  setup({ composer }) {
    composer.transform(applyTextStyles);
  },
});
