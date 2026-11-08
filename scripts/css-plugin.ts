import type { Plugin } from "esbuild";
import { transform } from "lightningcss";
import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";

const STYLES_RUNTIME = resolve("src/ui/styles.ts");
const TARGETS = { chrome: 111 << 16, firefox: 128 << 16 };

/**
 * `*.module.css` → hashed class map; the compiled CSS registers itself with the
 * RxE style registry on import. `*.global.css` → the compiled CSS as a string.
 * Both go through lightningcss for nesting, prefixing and minification.
 */
export function cssPlugin({ minify }: { minify: boolean }): Plugin {
  return {
    name: "rxe-css",
    setup(build) {
      build.onLoad({ filter: /\.(module|global)\.css$/ }, async ({ path }) => {
        const isModule = path.endsWith(".module.css");
        const { code, exports } = transform({
          filename: path,
          code: await readFile(path),
          minify,
          targets: TARGETS,
          cssModules: isModule ? { pattern: "rxe-[hash]-[local]" } : false,
        });
        const css = code.toString();
        if (!isModule) return { contents: `export default ${JSON.stringify(css)};`, loader: "js" };

        const classes = Object.fromEntries(
          Object.entries(exports ?? {}).map(([local, entry]) => [
            local,
            [entry.name, ...entry.composes.map((composed) => composed.name)].join(" "),
          ])
        );
        return {
          loader: "js",
          contents: [
            `import { registerStyles } from ${JSON.stringify(STYLES_RUNTIME)};`,
            `registerStyles(${JSON.stringify(relative("src", path))}, ${JSON.stringify(css)});`,
            `export default ${JSON.stringify(classes)};`,
          ].join("\n"),
        };
      });
    },
  };
}
