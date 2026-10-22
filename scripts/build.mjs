#!/usr/bin/env node
/**
 * Build the two halves of the plugin:
 *
 *   lib/client.js  the browser bundle the DSH web client loads
 *   index.js       the host entry (no host-side behaviour, but the loader
 *                  still imports it, so it must exist and export `apply`)
 *
 * The client bundle is wrapped in the `window.__ModuleLoader__.load({...})`
 * envelope the DSH module system expects: executing the file must only
 * *register* a factory, never run the plugin.
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8"));

const banner = `/**
 * ${pkg.name} ${pkg.version} — ${pkg.description}
 *
 * DSH web client bundle. Running this file only registers a factory with the
 * module loader; the plugin body runs when the host materialises the module.
 */`;

async function main() {
  await mkdir(join(root, "lib"), { recursive: true });

  const result = await build({
    entryPoints: [join(root, "src/client.ts")],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    legalComments: "none",
    // React and the module loader come from the host, never from this package.
    external: ["react"],
    globalName: "__dshAsciiSharks",
    banner: { js: banner },
  });

  const body = result.outputFiles[0].text;
  const wrapped = [
    banner,
    "window.__ModuleLoader__.load({",
    `\tid: ${JSON.stringify(pkg.name)},`,
    "\tfactory: (require) => {",
    '\t\t"use strict";',
    "\t\tvar module = { exports: {} };",
    "\t\tvar exports = module.exports;",
    '\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });',
    "\t\tvar __plugin = (function () {",
    body,
    "\t\treturn __dshAsciiSharks;",
    "\t\t})();",
    "\t\tvar __exports = __plugin || {};",
    "\t\tObject.keys(__exports).forEach(function (key) {",
    "\t\t\tif (key !== \"__esModule\") exports[key] = __exports[key];",
    "\t\t});",
    "\t\treturn module.exports;",
    "\t},",
    "});",
    "",
  ].join("\n");

  await writeFile(join(root, "lib/client.js"), wrapped, "utf8");
  console.log(`lib/client.js  ${(wrapped.length / 1024).toFixed(1)} KiB`);
}

await main();
