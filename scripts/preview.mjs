import { createServer } from "node:http";
import { stat, readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = resolve("out");
const port = Number(process.env.PORT || 3000);
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".bib": "application/x-bibtex; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".xml": "application/xml; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".pdf": "application/pdf", ".woff2": "font/woff2" };

try {
  await stat(resolve(root, "index.html"));
} catch (error) {
  console.error("Static export is missing. Run npm run build before npm start.", error.message);
  process.exit(1);
}

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" }).end("Method not allowed");
      return;
    }
    let exists = true;
    try {
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      await stat(file);
    } catch (error) {
      if (error.code !== "ENOENT" && error.code !== "ENOTDIR") throw error;
      exists = false;
      file = resolve(root, "404.html");
    }
    const body = await readFile(file);
    const contentType = pathname === "/feed.xml" ? "application/rss+xml; charset=utf-8" : types[extname(file)] || (pathname === "/opengraph-image" ? "image/png" : "application/octet-stream");
    response.writeHead(exists ? 200 : 404, { "Content-Type": contentType, "Content-Length": body.length });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch (error) {
    if (error instanceof URIError) {
      response.writeHead(400).end("Malformed URL");
      return;
    }
    console.error("Preview request failed:", error);
    response.writeHead(500).end("Preview server error");
  }
}).listen(port, "127.0.0.1", () => console.log(`Static preview: http://127.0.0.1:${port}`));
