const test = require("node:test");
const assert = require("node:assert/strict");
const { DIMENSIONS, ITEMS } = require("../js/data.js");
const S = require("../js/scoring.js");

function answerAll(fn) {
  const a = {};
  ITEMS.forEach((it) => { a[it.id] = fn(it); });
  return a;
}

test("data: 10 dimensions, 5 items each, at least 2 reverse-keyed", () => {
  assert.equal(DIMENSIONS.length, 10);
  assert.equal(ITEMS.length, 50);
  for (const d of DIMENSIONS) {
    const its = ITEMS.filter((i) => i.dim === d.id);
    assert.equal(its.length, 5, d.id);
    assert.ok(its.filter((i) => i.key < 0).length >= 2, d.id + " needs >=2 reverse items");
  }
  const ids = new Set(ITEMS.map((i) => i.id));
  assert.equal(ids.size, ITEMS.length, "item ids unique");
});

test("keyValue reverses negative items", () => {
  assert.equal(S.keyValue({ key: 1 }, 1), 1);
  assert.equal(S.keyValue({ key: 1 }, 5), 5);
  assert.equal(S.keyValue({ key: -1 }, 1), 5);
  assert.equal(S.keyValue({ key: -1 }, 5), 1);
  assert.equal(S.keyValue({ key: -1 }, 3), 3);
});

test("all pole-A answers score +100 on every dimension", () => {
  const p = S.buildProfile(DIMENSIONS, ITEMS, answerAll((it) => (it.key > 0 ? 5 : 1)));
  for (const d of p.dimensions) {
    assert.equal(d.score, 100, d.id);
    assert.equal(d.strength, "strongly");
    assert.equal(d.leaning, d.poles[0]);
    assert.equal(d.consistency, "consistent");
  }
});

test("all pole-B answers score -100 on every dimension", () => {
  const p = S.buildProfile(DIMENSIONS, ITEMS, answerAll((it) => (it.key > 0 ? 1 : 5)));
  for (const d of p.dimensions) {
    assert.equal(d.score, -100, d.id);
    assert.equal(d.leaning, d.poles[1]);
  }
});

test("all neutral scores 0 and balanced", () => {
  const p = S.buildProfile(DIMENSIONS, ITEMS, answerAll(() => 3));
  for (const d of p.dimensions) {
    assert.equal(d.score, 0);
    assert.equal(d.strength, "balanced");
    assert.equal(d.leaning, null);
  }
  assert.match(p.summary, /fairly balanced on/);
});

test("strength thresholds", () => {
  assert.equal(S.strengthLabel(0), "balanced");
  assert.equal(S.strengthLabel(14), "balanced");
  assert.equal(S.strengthLabel(15), "leans");
  assert.equal(S.strengthLabel(-44), "leans");
  assert.equal(S.strengthLabel(45), "clearly");
  assert.equal(S.strengthLabel(74), "clearly");
  assert.equal(S.strengthLabel(-75), "strongly");
  assert.equal(S.strengthLabel(100), "strongly");
});

test("agreeing with everything flags mixed views", () => {
  // Agree strongly with both + and - items: keyed values become 5,5,5,1,1 -> sd ~1.96
  const p = S.buildProfile(DIMENSIONS, ITEMS, answerAll(() => 5));
  for (const d of p.dimensions) {
    assert.equal(d.consistency, "mixed", d.id);
    assert.equal(d.score, 20); // mean 3.4
  }
  assert.match(p.summary, /pointed in different directions/);
});

test("incomplete answers return null profile", () => {
  const a = answerAll(() => 4);
  delete a[ITEMS[7].id];
  assert.equal(S.buildProfile(DIMENSIONS, ITEMS, a), null);
});

test("priorities are ordered by absolute score", () => {
  const a = answerAll(() => 3);
  // Make 'environment' strongly pole A and 'local' moderately pole B
  ITEMS.filter((i) => i.dim === "environment").forEach((i) => { a[i.id] = i.key > 0 ? 5 : 1; });
  ITEMS.filter((i) => i.dim === "local").forEach((i) => { a[i.id] = i.key > 0 ? 2 : 4; });
  const p = S.buildProfile(DIMENSIONS, ITEMS, a);
  assert.equal(p.priorities[0], "environment");
  assert.equal(p.priorities[1], "local");
  assert.match(p.summary, /^I strongly favour environment over growth/);
});

test("shuffle contains every item once with no adjacent same-dimension items", () => {
  for (let seed = 1; seed <= 5000; seed++) {
    const out = S.shuffleItems(ITEMS, seed);
    assert.equal(out.length, ITEMS.length);
    assert.equal(new Set(out.map((i) => i.id)).size, ITEMS.length);
    for (let i = 1; i < out.length; i++) {
      assert.notEqual(out[i].dim, out[i - 1].dim, `seed ${seed} pos ${i}`);
    }
  }
});

test("shuffle is deterministic for a seed and varies across seeds", () => {
  const a = S.shuffleItems(ITEMS, 42).map((i) => i.id).join();
  const b = S.shuffleItems(ITEMS, 42).map((i) => i.id).join();
  const c = S.shuffleItems(ITEMS, 43).map((i) => i.id).join();
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("prompt embeds the profile JSON and placeholders", () => {
  const p = S.buildProfile(DIMENSIONS, ITEMS, answerAll(() => 4), new Date("2026-09-05T10:00:00Z"));
  const txt = S.buildPrompt(p);
  assert.match(txt, /\[COUNTRY\]/);
  assert.match(txt, /"completedAt": "2026-09-05T10:00:00.000Z"/);
  const json = txt.split("```json\n")[1].split("\n```")[0];
  assert.deepEqual(JSON.parse(json), p);
});
