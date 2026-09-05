const test = require("node:test");
const assert = require("node:assert/strict");
const { DIMENSIONS } = require("../js/data.js");
const M = require("../js/matching.js");

const IDS = DIMENSIONS.map((d) => d.id);

function person(scoreFn, mixedIds = []) {
  return {
    dimensions: IDS.map((id) => ({
      id, score: scoreFn(id), consistency: mixedIds.includes(id) ? "mixed" : "consistent"
    }))
  };
}
function party(id, scoreFn, confidence = "high") {
  const dims = {};
  IDS.forEach((d) => { const s = scoreFn(d); dims[d] = s === undefined ? undefined : { score: s, confidence }; });
  return { id, short: id, name: id, dimensions: dims };
}

test("weight floor and mixed halving", () => {
  assert.equal(M.weightFor({ score: 0, consistency: "consistent" }), 10);
  assert.equal(M.weightFor({ score: -60, consistency: "consistent" }), 60);
  assert.equal(M.weightFor({ score: 60, consistency: "mixed" }), 30);
  assert.equal(M.weightFor({ score: 0, consistency: "mixed" }), 5);
});

test("identical profile gives 100, opposite gives 0", () => {
  const p = person((id) => (id === "environment" ? 80 : -40));
  const same = party("same", (id) => (id === "environment" ? 80 : -40));
  assert.equal(M.matchParty(p, same).alignment, 100);
  const pExt = person(() => 100);
  assert.equal(M.matchParty(pExt, party("opp", () => -100)).alignment, 0);
  assert.equal(M.matchParty(pExt, party("same2", () => 100)).alignment, 100);
});

test("null party cells are skipped, not counted as disagreement", () => {
  const p = person(() => 50);
  const full = party("full", () => 50);
  const partial = party("partial", (id) => (id === "diplomacy" ? null : 50));
  assert.equal(M.matchParty(p, full).alignment, 100);
  const r = M.matchParty(p, partial);
  assert.equal(r.alignment, 100);
  assert.equal(r.scoredDimensions, 9);
  assert.equal(r.cells.find((c) => c.id === "diplomacy").party, null);
  assert.equal(r.coverage, 0.9);
  assert.equal(r.adjusted, 95, "unknown dimensions pull the headline toward 50");
});

test("sparse evidence cannot outrank full coverage on the adjusted figure", () => {
  const p = person(() => 60);
  const sparse = party("sparse", (id) => (["liberty", "local"].includes(id) ? 60 : null));
  const full = party("full", () => 40);
  const ranking = M.matchParties(p, [sparse, full]);
  assert.equal(ranking[0].id, "full");
  assert.equal(ranking[1].alignment, 100, "raw alignment over scored cells stays 100");
  assert.equal(ranking[1].adjusted, 60);
});

test("all-balanced person still ranks without NaN", () => {
  const p = person(() => 0);
  const a = party("a", () => 20);
  const b = party("b", () => 80);
  const ranking = M.matchParties(p, [b, a]);
  assert.equal(ranking[0].id, "a");
  assert.equal(ranking[0].rank, 1);
  ranking.forEach((r) => assert.ok(Number.isFinite(r.alignment)));
});

test("mixed dimensions count half", () => {
  const consistent = person((id) => (id === "liberty" ? 80 : 0));
  const mixed = person((id) => (id === "liberty" ? 80 : 0), ["liberty"]);
  const pty = party("x", (id) => (id === "liberty" ? -80 : 0));
  const rc = M.matchParty(consistent, pty), rm = M.matchParty(mixed, pty);
  assert.ok(rm.alignment > rc.alignment, "a mixed disagreement should hurt less");
});

test("agreements and conflicts are ordered by weighted contribution", () => {
  const p = person((id) => ({ environment: 90, liberty: 60, local: 0 }[id] ?? 0));
  const pty = party("x", (id) => ({ environment: -90, liberty: 60, local: 0 }[id] ?? 0));
  const r = M.matchParty(p, pty);
  assert.equal(r.conflicts[0], "environment");
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.agreements[0], "liberty", "the heaviest dimension with zero delta should lead agreements");
});

test("confidence aggregates by weight and labels", () => {
  const p = person((id) => (id === "environment" ? 100 : 0));
  const high = party("h", () => 0, "high");
  const low = party("l", () => 0, "low");
  assert.equal(M.matchParty(p, high).confidence, "high");
  assert.equal(M.matchParty(p, low).confidence, "low");
});

test("discriminating dimensions report spread", () => {
  const a = party("a", (id) => (id === "environment" ? 100 : 0));
  const b = party("b", (id) => (id === "environment" ? -100 : 0));
  const d = M.discriminatingDimensions(IDS, [a, b]);
  assert.equal(d[0].id, "environment");
  assert.equal(d[0].spread, 200);
  assert.equal(d[d.length - 1].spread, 0);
});

test("export block carries the ranking", () => {
  const p = person(() => 10);
  const ranking = M.matchParties(p, [party("a", () => 10), party("b", () => -50)]);
  const blk = M.exportBlock(ranking, { jurisdiction: "New Zealand", assessedAt: "2026-09-06", rubricVersion: "1.0" });
  assert.equal(blk.ranking[0].party, "a");
  assert.equal(blk.ranking[0].alignment, 100);
  assert.equal(blk.jurisdiction, "New Zealand");
});
