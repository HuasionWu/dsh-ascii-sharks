#!/usr/bin/env node
/**
 * Serve the repository root so `harness/index.html` can load `/lib/client.js`
 * and React from `node_modules`. Development only — the real host serves the
 * bundle itself.
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = Number(process.env.PORT || 8931);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  let path = decodeURIComponent(url.pathname);
  if (path === "/") path = "/harness/index.html";
  const target = normalize(join(root, path));
  if (!target.startsWith(root)) {
    res.writeHead(403).end("forbidden");
    return;
  }
  try {
    const body = await readFile(target);
    res.writeHead(200, { "content-type": TYPES[extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`harness: http://127.0.0.1:${port}/harness/index.html`);
});
