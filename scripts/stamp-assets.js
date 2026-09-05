#!/usr/bin/env node
// Cache-busts the site's own stylesheets, scripts and audio by appending a
// content hash to every local href/src in the HTML pages: css/style.css
// becomes css/style.css?v=1a2b3c4d. Browsers and GitHub Pages then treat a
// changed file as a new URL, so a deploy never leaves anyone on stale CSS or
// JS. Run by the Pages workflow on the checkout it uploads, never on the
// repository itself, so the sources stay readable and diffable.
//
// Usage: node scripts/stamp-assets.js [file.html ...]   (default: index.html sources.html)
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const pages = process.argv.slice(2);
if (!pages.length) pages.push("index.html", "sources.html");

const ASSET = /(\b(?:href|src)=")((?!https?:|\/\/|data:|#)[^"?#]+\.(?:css|js|mp3))(")/g;
const hashes = {};
function hashOf(rel) {
  if (!hashes[rel]) {
    const file = path.join(ROOT, rel);
    hashes[rel] = crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 8);
  }
  return hashes[rel];
}

for (const page of pages) {
  const file = path.join(ROOT, page);
  const before = fs.readFileSync(file, "utf8");
  let count = 0;
  const after = before.replace(ASSET, (m, open, rel, close) => {
    if (!fs.existsSync(path.join(ROOT, rel))) return m;
    count++;
    return open + rel + "?v=" + hashOf(rel) + close;
  });
  fs.writeFileSync(file, after);
  console.log(`${page}: stamped ${count} asset reference${count === 1 ? "" : "s"}`);
}
