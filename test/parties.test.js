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

test("electorate files validate and the generated electorates.js is in sync", () => {
  const out = execFileSync("node", [path.join(ROOT, "scripts", "build-electorates.js"), "--check"], { encoding: "utf8" });
  assert.match(out, /^OK:/);
  const E = require("../data/nz/electorates.js");
  for (const e of E.electorates) for (const c of e.candidates) for (const id of DIM_IDS) {
    const cell = c.dimensions[id];
    assert.ok(cell && ["candidate", "party", "none"].includes(cell.basis), `${e.id}/${c.id}/${id} has no basis`);
    if (cell.basis !== "none") assert.ok(Number.isInteger(cell.score), `${e.id}/${c.id}/${id} should carry a score`);
  }
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
  const walk = (dir) => {
    const entries = fs.readdirSync(dir);
    if (entries.includes("manifest.json")) {
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8"));
      const listed = new Set(manifest.entries.flatMap((e) => [e.filename, e.textFile].filter(Boolean)));
      for (const f of entries) {
        if (f === "manifest.json" || f.endsWith(".txt") || f.startsWith(".")) continue;
        if (fs.statSync(path.join(dir, f)).isDirectory()) continue;
        assert.ok(listed.has(f), `${path.relative(ROOT, path.join(dir, f))} is not in manifest.json`);
      }
    } else {
      for (const f of entries) {
        if (f.startsWith(".")) continue;
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) walk(full);
        else assert.fail(`${path.relative(ROOT, full)} sits in a folder without a manifest.json`);
      }
    }
  };
  for (const dir of fs.readdirSync(base)) {
    const full = path.join(base, dir);
    if (fs.statSync(full).isDirectory()) walk(full);
  }
});
