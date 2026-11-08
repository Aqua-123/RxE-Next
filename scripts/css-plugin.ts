import tailwind from "@tailwindcss/postcss";
import type { Plugin } from "esbuild";
import { transform } from "lightningcss";
import postcss from "postcss";
import { readFile } from "node:fs/promises";

const TARGETS = { chrome: 111 << 16, firefox: 128 << 16 };

/**
 * CSS is imported as a string, never emitted as a file: RxE adopts it into its own
 * shadow roots or injects it into the site at runtime.
 *
 * - `*.tailwind.css`: compiled by Tailwind (scanning `src` for classes), then lightningcss.
 * - `*.global.css`:   lightningcss only; for stylesheets RxE puts on the site itself.
 */
export function cssPlugin({ minify }: { minify: boolean }): Plugin {
  return {
    name: "rxe-css",
    setup(build) {
      build.onLoad({ filter: /\.(tailwind|global)\.css$/ }, async ({ path }) => {
        let css = await readFile(path, "utf8");
        const watchFiles: string[] = [];
        const watchDirs: string[] = [];
        if (path.endsWith(".tailwind.css")) {
          const result = await postcss([tailwind({ optimize: false })]).process(css, { from: path });
          css = result.css;
          // Tailwind scans source directories for class names; rebuild when they change.
          for (const message of result.messages) {
            if (message.type === "dependency") watchFiles.push(message.file);
            if (message.type === "dir-dependency") watchDirs.push(message.dir);
          }
        }
        const { code } = transform({ filename: path, code: Buffer.from(css), minify, targets: TARGETS });
        return {
          contents: `export default ${JSON.stringify(code.toString())};`,
          loader: "js",
          watchFiles,
          watchDirs,
        };
      });
    },
  };
}
