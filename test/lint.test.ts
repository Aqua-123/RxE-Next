import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/** Proves the design-system lint rules still fire: every line of the violation fixtures must be reported. */

interface Diagnostic {
  category: string;
  location: { path: string; start: { line: number } };
}

function lintFixtures(): Diagnostic[] {
  const result = Bun.spawnSync(
    [
      "node_modules/.bin/biome",
      "lint",
      "--config-path=lint/fixtures.biome.json",
      "--reporter=json",
      "lint/fixtures",
    ],
    { stderr: "ignore" }
  );
  const output = result.stdout.toString();
  return JSON.parse(output.slice(output.indexOf("{"))).diagnostics;
}

/** Lines that should be reported: everything except comments, blanks and type declarations. */
function codeLines(path: string): number[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .flatMap((line, index) =>
      line.trim() && !/^(\/\/|\/\*|declare )/.test(line.trim()) ? [index + 1] : []
    );
}

const diagnostics = lintFixtures();
const reportedLines = (file: string) =>
  [
    ...new Set(
      diagnostics.filter((d) => d.location.path.endsWith(file)).map((d) => d.location.start.line)
    ),
  ].sort((a, b) => a - b);

test("every inline-style, color-literal and portal violation in TSX is reported", () => {
  expect(reportedLines("violations.tsx")).toEqual(codeLines("lint/fixtures/violations.tsx"));
});

test("every color literal in CSS is reported", () => {
  expect(reportedLines("violations.css")).toEqual(codeLines("lint/fixtures/violations.css"));
});

test("token-based code is not reported", () => {
  expect(reportedLines("allowed.tsx")).toEqual([]);
});
