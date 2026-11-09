/**
 * Site panels that get the theme's glass effect (blur behind translucent surfaces).
 *
 * `backdrop-filter` makes an element a stacking context, which traps its popups'
 * z-index inside it. Panels whose popups must overlay the rest of the page (the
 * header's dropdowns) are `raised` above the page content. The chat and sidebar
 * panels already clip their content, so trapping changes nothing there.
 */
export const GLASS_TARGETS: readonly { selector: string; raised?: boolean }[] = [
  { selector: '[class*="Layout_dashboard-header__"]', raised: true },
  { selector: '[class*="Layout_nav-drawer-menu__"]' },
  { selector: ".dropdown .menu" },
  { selector: ".EmeraldPopup" },
  { selector: ".sideInfo" },
  { selector: '[class*="room_global_chatSection__"]' },
];
