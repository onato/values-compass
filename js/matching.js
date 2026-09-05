// Party matching: pure functions, no DOM. Loaded in the browser and under node --test.

var Matching = (function () {
  var CONFIDENCE_VALUE = { high: 1, medium: 0.6, low: 0.3 };
  var WEIGHT_FLOOR = 10;

  // Weight per dimension: how much the person leans, with a floor so an
  // all-balanced person still gets a ranking; halved where their answers were mixed.
  function weightFor(personDim) {
    var w = Math.max(Math.abs(personDim.score), WEIGHT_FLOOR);
    if (personDim.consistency === "mixed") w = w / 2;
    return w;
  }

  function confidenceLabel(v) {
    if (v >= 0.8) return "high";
    if (v >= 0.45) return "medium";
    return "low";
  }

  // profile: the person's profile from Scoring.buildProfile.
  // party: one entry from PARTIES_NZ (dimensions keyed by id).
  function matchParty(profile, party) {
    var sumW = 0, sumWd2 = 0, sumWc = 0, scored = 0;
    var cells = [];
    profile.dimensions.forEach(function (pd) {
      var cell = party.dimensions[pd.id];
      var w = weightFor(pd);
      if (!cell || typeof cell.score !== "number") {
        cells.push({ id: pd.id, person: pd.score, party: null, weight: w, delta: null, contribution: 0, confidence: cell ? cell.confidence : "low" });
        return;
      }
      var delta = pd.score - cell.score;
      var contribution = w * delta * delta;
      sumW += w; sumWd2 += contribution; scored++;
      sumWc += w * (CONFIDENCE_VALUE[cell.confidence] || 0.3);
      cells.push({ id: pd.id, person: pd.score, party: cell.score, weight: w, delta: delta, contribution: contribution, confidence: cell.confidence });
    });
    var distance = scored ? Math.sqrt(sumWd2 / sumW) : 200;
    var alignment = Math.round(100 * (1 - distance / 200));
    var conf = scored ? sumWc / sumW : 0;
    var comparable = cells.filter(function (c) { return c.party !== null; });
    var byAgreement = comparable.slice().sort(function (a, b) { return a.contribution - b.contribution || b.weight - a.weight; });
    var byConflict = comparable.slice().sort(function (a, b) { return b.contribution - a.contribution; });
    return {
      id: party.id,
      short: party.short,
      name: party.name,
      alignment: alignment,
      distance: Math.round(distance * 10) / 10,
      confidence: confidenceLabel(conf),
      confidenceValue: Math.round(conf * 100) / 100,
      scoredDimensions: scored,
      cells: cells,
      agreements: byAgreement.slice(0, 3).map(function (c) { return c.id; }),
      conflicts: byConflict.filter(function (c) { return Math.abs(c.delta) >= 30; }).slice(0, 3).map(function (c) { return c.id; })
    };
  }

  // parties: array of party objects. Returns ranking, best first.
  function matchParties(profile, parties) {
    var ranking = parties.map(function (p) { return matchParty(profile, p); });
    ranking.sort(function (a, b) { return b.alignment - a.alignment || a.distance - b.distance || a.short.localeCompare(b.short); });
    ranking.forEach(function (r, i) { r.rank = i + 1; });
    return ranking;
  }

  // How much the parties differ on each dimension: range of their scores.
  // Returns [{id, spread, min, max, scored}] sorted by spread, largest first.
  function discriminatingDimensions(dimensionIds, parties) {
    return dimensionIds.map(function (id) {
      var scores = parties.map(function (p) { return p.dimensions[id]; })
        .filter(function (c) { return c && typeof c.score === "number"; })
        .map(function (c) { return c.score; });
      if (!scores.length) return { id: id, spread: 0, min: null, max: null, scored: 0 };
      var min = Math.min.apply(null, scores), max = Math.max.apply(null, scores);
      return { id: id, spread: max - min, min: min, max: max, scored: scores.length };
    }).sort(function (a, b) { return b.spread - a.spread; });
  }

  // Compact block for the JSON export and the research prompt.
  function exportBlock(ranking, meta) {
    return {
      jurisdiction: meta.jurisdiction,
      assessedAt: meta.assessedAt,
      rubricVersion: meta.rubricVersion,
      method: "alignment = 100 x (1 - weighted RMS distance / 200); weight = max(|my score|, 10), halved where my answers were mixed",
      ranking: ranking.map(function (r) {
        return { rank: r.rank, party: r.short, alignment: r.alignment, confidence: r.confidence, agreements: r.agreements, conflicts: r.conflicts };
      })
    };
  }

  return {
    weightFor: weightFor,
    matchParty: matchParty,
    matchParties: matchParties,
    discriminatingDimensions: discriminatingDimensions,
    exportBlock: exportBlock,
    WEIGHT_FLOOR: WEIGHT_FLOOR
  };
})();

if (typeof module !== "undefined") {
  module.exports = Matching;
}
