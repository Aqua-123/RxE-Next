import { defineFeature } from "@/core/feature";
import { disguiseEmails, revealEmails } from "@/site/disguise";

export default defineFeature({
  id: "email-defang",
  name: "Email defanging",
  description:
    "The site silently drops messages with email addresses. This swaps the dots in their domain for a look-alike (．) so they get through, and shows them normally to RxE users.",
  category: "chat",
  setup({ composer, messages }) {
    composer.transform(disguiseEmails);
    messages.rewriteText(revealEmails);
  },
});
