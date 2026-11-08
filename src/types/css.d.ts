/** Scoped component styles: class names are hashed and the CSS is adopted into the page and RxE shadow roots. */
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}

/** Unscoped CSS returned as text, for stylesheets RxE injects into the site itself (themes, site fixes). */
declare module "*.global.css" {
  const css: string;
  export default css;
}
