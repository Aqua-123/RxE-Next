import { defineFeature } from "@/core/feature";
import { OLDER_VERSIONS, SITE_VERSION_SWITCHER } from "@/site/header";
import { hideCss } from "@/site/upsells";

/** Matches the site's account menu items (`.menuItem > button`). */
function OlderVersionsItem() {
  return (
    <div role="none" className="flex flex-col gap-0.5 p-2.5 leading-[normal]">
      <span className="text-muted-foreground text-xs">Older versions</span>
      <span className="flex gap-3 text-base">
        {OLDER_VERSIONS.map(({ label, href }) => (
          <a
            key={label}
            role="menuitem"
            href={href}
            className="rounded-sm font-bold text-link underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            {label}
          </a>
        ))}
      </span>
    </div>
  );
}

export default defineFeature({
  id: "site-version-links",
  name: "Older versions in the account menu",
  description:
    "Removes the header's “Choose Theme” button, which only links to the site's Legacy and Classic versions, and puts those links in the account menu.",
  category: "appearance",
  setup({ ui }) {
    ui.siteStyle("hide-switcher", hideCss([SITE_VERSION_SWITCHER]));
    ui.accountMenu.addItem(() => <OlderVersionsItem />);
  },
});
