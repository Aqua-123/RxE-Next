/** The header's "Choose Theme" dropdown, which only links to the site's older versions. */
export const SITE_VERSION_SWITCHER = '.dropdown:has(> div > button[aria-label="Old App"])';

/** Where that dropdown's "Legacy" and "Classic" options go. */
export const OLDER_VERSIONS = [
  { label: "Legacy", href: "https://emeraldchat.com/old/app" },
  { label: "Classic", href: "https://beta.emeraldchat.com/" },
] as const;
