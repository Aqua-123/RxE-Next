/** Bundled as plain text by esbuild (`loader: { ".css": "text" }`) and injected with `injectStyle`. */
declare module "*.css" {
  const css: string;
  export default css;
}
