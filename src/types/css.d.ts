/** Compiled Tailwind stylesheet, adopted into RxE shadow roots (see ui/styles.ts). */
declare module "*.tailwind.css" {
  const css: string;
  export default css;
}

/** Unscoped CSS returned as text, for stylesheets RxE injects into the site itself (themes, site fixes). */
declare module "*.global.css" {
  const css: string;
  export default css;
}
