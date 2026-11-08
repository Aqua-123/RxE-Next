import { build, context, type BuildOptions, type Plugin } from "esbuild";
import { cp, readFile, rm, writeFile } from "node:fs/promises";
import { cssPlugin } from "./scripts/css-plugin";

const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
  version: string;
  description: string;
};
const watchMode = process.argv.includes("--watch");

const NAME = "RxE Next";
const MATCHES = ["*://emeraldchat.com/*", "*://www.emeraldchat.com/*"];
// The old Rails app still runs at /old/app and is handled by the original RxE.
const EXCLUDES = ["*://emeraldchat.com/old/*", "*://www.emeraldchat.com/old/*"];
const EXTENSION_DIR = "dist/extension";
const BUNDLE = `${EXTENSION_DIR}/rxe.js`;
const USERSCRIPT = "dist/rxe-next.user.js";

const manifest = {
  manifest_version: 3,
  name: NAME,
  version: pkg.version,
  description: pkg.description,
  icons: { 16: "icons/logo-16.png", 32: "icons/logo-32.png", 48: "icons/logo-48.png", 128: "icons/logo-128.png" },
  content_scripts: [
    {
      matches: MATCHES,
      exclude_matches: EXCLUDES,
      js: ["rxe.js"],
      run_at: "document_start",
      world: "MAIN",
    },
  ],
  browser_specific_settings: {
    gecko: { id: "rxe-next@emeraldchat", strict_min_version: "128.0" },
  },
};

const userscriptHeader = [
  "// ==UserScript==",
  `// @name         ${NAME}`,
  "// @namespace    rxe-next",
  `// @version      ${pkg.version}`,
  `// @description  ${pkg.description}`,
  ...MATCHES.map((pattern) => `// @match        ${pattern}`),
  ...EXCLUDES.map((pattern) => `// @exclude      ${pattern}`),
  "// @run-at       document-start",
  "// @grant        none",
  "// ==/UserScript==",
  "",
].join("\n");

const emitArtifacts: Plugin = {
  name: "emit-artifacts",
  setup(builder) {
    builder.onEnd(async (result) => {
      if (result.errors.length > 0) return;
      const bundle = await readFile(BUNDLE, "utf8");
      await Promise.all([
        writeFile(`${EXTENSION_DIR}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`),
        cp("static/icons", `${EXTENSION_DIR}/icons`, { recursive: true }),
        writeFile(USERSCRIPT, userscriptHeader + bundle),
      ]);
    });
  },
};

const options: BuildOptions = {
  entryPoints: ["src/main.ts"],
  outfile: BUNDLE,
  bundle: true,
  format: "iife",
  target: "es2022",
  jsx: "automatic",
  jsxImportSource: "react",
  define: {
    __RXE_VERSION__: JSON.stringify(pkg.version),
    "process.env.NODE_ENV": JSON.stringify(watchMode ? "development" : "production"),
  },
  minify: !watchMode,
  sourcemap: watchMode ? "inline" : false,
  legalComments: "none",
  logLevel: "info",
  plugins: [cssPlugin({ minify: !watchMode }), emitArtifacts],
};

await rm("dist", { recursive: true, force: true });
if (watchMode) {
  await (await context(options)).watch();
} else {
  await build(options);
}
