// Pure scoring functions. No DOM access; loaded both in the browser and under node --test.

var Scoring = (function () {
  var STRENGTH = [
    { min: 75, label: "strongly" },
    { min: 45, label: "clearly" },
    { min: 15, label: "leans" },
    { min: 0,  label: "balanced" }
  ];
  var MIXED_SD = 1.2;

  // Response 1..5 -> keyed value 1..5 where 5 always means "fully pole A".
  function keyValue(item, response) {
    return item.key > 0 ? response : 6 - response;
  }

  function mean(xs) {
    return xs.reduce(function (a, b) { return a + b; }, 0) / xs.length;
  }

  function stddev(xs) {
    var m = mean(xs);
    var v = mean(xs.map(function (x) { return (x - m) * (x - m); }));
    return Math.sqrt(v);
  }

  function strengthLabel(score) {
    var a = Math.abs(score);
    for (var i = 0; i < STRENGTH.length; i++) {
      if (a >= STRENGTH[i].min) return STRENGTH[i].label;
    }
    return "balanced";
  }

  // answers: { itemId: response }. Returns null if any item for the dimension is unanswered.
  function scoreDimension(dim, items, answers) {
    var keyed = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dim !== dim.id) continue;
      var r = answers[it.id];
      if (typeof r !== "number") return null;
      keyed.push(keyValue(it, r));
    }
    if (keyed.length === 0) return null;
    var m = mean(keyed);
    var score = Math.round((m - 3) / 2 * 100);
    var sd = stddev(keyed);
    var strength = strengthLabel(score);
    return {
      id: dim.id,
      poles: dim.poles.slice(),
      score: score,
      strength: strength,
      leaning: strength === "balanced" ? null : (score > 0 ? dim.poles[0] : dim.poles[1]),
      consistency: sd > MIXED_SD ? "mixed" : "consistent",
      sd: Math.round(sd * 100) / 100
    };
  }

  function buildProfile(dimensions, items, answers, now) {
    var scored = dimensions.map(function (d) { return scoreDimension(d, items, answers); });
    if (scored.some(function (s) { return s === null; })) return null;
    var priorities = scored.slice().sort(function (a, b) {
      return Math.abs(b.score) - Math.abs(a.score);
    }).map(function (s) { return s.id; });
    return {
      version: "1.0",
      completedAt: (now || new Date()).toISOString(),
      scale: { min: -100, max: 100, positiveMeans: "pole A (first-listed pole)" },
      dimensions: scored,
      priorities: priorities,
      summary: buildSummary(dimensions, scored)
    };
  }

  function buildSummary(dimensions, scored) {
    var byId = {};
    dimensions.forEach(function (d) { byId[d.id] = d; });
    var ordered = scored.slice().sort(function (a, b) {
      return Math.abs(b.score) - Math.abs(a.score);
    });
    var lines = [];
    var balanced = [];
    var mixed = [];
    ordered.forEach(function (s) {
      var d = byId[s.id];
      if (s.consistency === "mixed") mixed.push(d);
      if (s.strength === "balanced") { balanced.push(d); return; }
      var side = s.score > 0 ? 0 : 1;
      var verb = { strongly: "strongly favour", clearly: "clearly favour", leans: "lean towards" }[s.strength];
      lines.push("You " + verb + " " + d.poles[side].toLowerCase() + " over " +
        d.poles[1 - side].toLowerCase() + ": " + d.describe[side] + ".");
    });
    if (balanced.length) {
      var names = balanced.map(function (d) { return d.poles[0] + " vs. " + d.poles[1]; });
      lines.push("You are fairly balanced on " + joinNatural(names) + ".");
    }
    if (mixed.length) {
      var mnames = mixed.map(function (d) { return d.poles[0] + " vs. " + d.poles[1]; });
      lines.push("Your answers on " + joinNatural(mnames) +
        " pointed in different directions, so treat " + (mixed.length === 1 ? "that score" : "those scores") +
        " as less certain.");
    }
    return lines.join(" ");
  }

  function joinNatural(xs) {
    if (xs.length <= 1) return xs.join("");
    return xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
  }

  // Deterministic PRNG so a session's order is stable across reloads.
  function mulberry32(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Shuffle items so no two consecutive items share a dimension.
  // Works by round-robin over per-dimension queues, each queue and the
  // dimension order shuffled with the seed.
  function shuffleItems(items, seed) {
    var rnd = mulberry32(seed >>> 0);
    var queues = {};
    var dims = [];
    items.forEach(function (it) {
      if (!queues[it.dim]) { queues[it.dim] = []; dims.push(it.dim); }
      queues[it.dim].push(it);
    });
    function fisherYates(arr) {
      for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(rnd() * (i + 1));
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
      }
      return arr;
    }
    dims.forEach(function (d) { fisherYates(queues[d]); });
    var out = [];
    var lastDim = null;
    var remaining = items.length;
    while (remaining > 0) {
      // Candidate dims with items left, excluding the one just used; prefer the
      // longest queue so we never get stuck with only one dimension at the end.
      var candidates = dims.filter(function (d) { return queues[d].length > 0 && d !== lastDim; });
      if (candidates.length === 0) candidates = dims.filter(function (d) { return queues[d].length > 0; });
      // A dimension holding at least half of what's left must go now, or it
      // will be forced into adjacent slots later.
      var urgent = candidates.filter(function (d) { return queues[d].length * 2 >= remaining; });
      var pool = urgent.length ? urgent : candidates;
      var pick = pool[Math.floor(rnd() * pool.length)];
      out.push(queues[pick].shift());
      lastDim = pick;
      remaining--;
    }
    return out;
  }

  // Ready-to-paste prompt for the matching step.
  function buildPrompt(profile) {
    return [
      "I completed a values self-assessment. Below is my profile as JSON: ten bipolar dimensions",
      "scored from -100 (fully the second pole) to +100 (fully the first pole), listed in priority",
      "order by how strongly I lean. Dimensions marked \"mixed\" are less certain.",
      "",
      "Country: [COUNTRY]",
      "Election: [ELECTION, e.g. national parliament 2026]",
      "",
      "Using this profile, rank the parties and, where relevant, the candidates on the ballot by how",
      "well their stated positions and record match my values. For each, explain the strongest",
      "agreements and the most important conflicts, and say which of my priority dimensions drove",
      "the ranking. Be explicit about uncertainty and do not assume positions you cannot support.",
      "",
      "```json",
      JSON.stringify(profile, null, 2),
      "```"
    ].join("\n");
  }

  return {
    keyValue: keyValue,
    strengthLabel: strengthLabel,
    scoreDimension: scoreDimension,
    buildProfile: buildProfile,
    buildSummary: buildSummary,
    shuffleItems: shuffleItems,
    buildPrompt: buildPrompt,
    stddev: stddev,
    MIXED_SD: MIXED_SD
  };
})();

if (typeof module !== "undefined") {
  module.exports = Scoring;
}
