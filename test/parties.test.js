const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { DIMENSIONS } = require("../js/data.js");
const PARTIES = require("../data/nz/parties.js");

const ROOT = path.join(__dirname, "..");
const DIM_IDS = DIMENSIONS.map((d) => d.id);

test("party files validate and the generated parties.js is in sync", () => {
  const out = execFileSync("node", [path.join(ROOT, "scripts", "build-parties.js"), "--check"], { encoding: "utf8" });
  assert.match(out, /^OK:/);
});

test("every party has all ten dimensions with sources for scored cells", () => {
  assert.ok(PARTIES.parties.length >= 1);
  for (const p of PARTIES.parties) {
    for (const id of DIM_IDS) {
      const c = p.dimensions[id];
      assert.ok(c, `${p.id} missing ${id}`);
      if (c.score !== null) {
        assert.ok(c.sources.length > 0, `${p.id}/${id} has no sources`);
        for (const s of c.sources) {
          if (s.archived) assert.ok(fs.existsSync(path.join(ROOT, s.archived)), `${p.id}/${id}: missing ${s.archived}`);
        }
      }
    }
  }
});

test("every archived research file is listed in its folder manifest", () => {
  const base = path.join(ROOT, "research", "nz");
  for (const dir of fs.readdirSync(base)) {
    const full = path.join(base, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    const manifest = JSON.parse(fs.readFileSync(path.join(full, "manifest.json"), "utf8"));
    const listed = new Set(manifest.entries.flatMap((e) => [e.filename, e.textFile].filter(Boolean)));
    for (const f of fs.readdirSync(full)) {
      if (f === "manifest.json" || f.endsWith(".txt")) continue;
      assert.ok(listed.has(f), `research/nz/${dir}/${f} is not in manifest.json`);
    }
  }
});
