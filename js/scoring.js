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
      lines.push("I " + verb + " " + d.poles[side].toLowerCase() + " over " +
        d.poles[1 - side].toLowerCase() + ": " + d.describe[side] + ".");
    });
    if (balanced.length) {
      var names = balanced.map(function (d) { return d.poles[0] + " vs. " + d.poles[1]; });
      lines.push("I am fairly balanced on " + joinNatural(names) + ".");
    }
    if (mixed.length) {
      var mnames = mixed.map(function (d) { return d.poles[0] + " vs. " + d.poles[1]; });
      lines.push("My answers on " + joinNatural(mnames) +
        " pointed in different directions, so " + (mixed.length === 1 ? "that score is" : "those scores are") +
        " less certain.");
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

  // Self-contained research prompt for the matching step. It carries everything an
  // agent needs: the dimension definitions, the person's profile, how to score
  // parties on the same scale, how to match, and what to report.
  function buildPrompt(profile, dimensions, opts) {
    opts = opts || {};
    var country = (opts.country || "").trim() || "[COUNTRY]";
    var election = (opts.election || "").trim() || "[ELECTION, e.g. national parliament 2026]";
    var byId = {};
    dimensions.forEach(function (d) { byId[d.id] = d; });

    var dimLines = dimensions.map(function (d, i) {
      return (i + 1) + ". " + d.id + " — " + d.poles[0] + " (+100) vs. " + d.poles[1] + " (−100). " +
        "+: " + d.describe[0] + ". −: " + d.describe[1] + ".";
    });

    var profileLines = profile.priorities.map(function (id) {
      var s = profile.dimensions.filter(function (x) { return x.id === id; })[0];
      var d = byId[id];
      var lean = s.leaning ? s.leaning : "balanced";
      return "- " + d.poles[0] + " vs. " + d.poles[1] + ": " + (s.score > 0 ? "+" : "") + s.score +
        " (" + s.strength + (s.consistency === "mixed" ? ", mixed answers" : "") + ")" +
        (s.leaning ? " → " + lean : "");
    });

    return [
      "# Task: match political parties and candidates to my values",
      "",
      "I completed a values self-assessment. Your job is to research the parties and candidates on my ballot,",
      "place each of them on the same ten value dimensions I was scored on, and then rank them by how well they",
      "match me. Work independently and show your evidence. I want to be able to check every claim.",
      "",
      "Country: " + country,
      "Election: " + election,
      "",
      "## My values profile",
      "",
      "In my own words: " + profile.summary,
      "",
      "Scores from −100 to +100, listed in priority order (strongest leaning first):",
      profileLines.join("\n"),
      "",
      "## The ten dimensions",
      "",
      "Each dimension is a scale between two poles. Positive scores lean to the first pole, negative to the second.",
      "These are values, not policies. Score by what a party's positions reveal about its priorities when values conflict.",
      "",
      dimLines.join("\n"),
      "",
      "## Step 1: research and score the parties and candidates",
      "",
      "1. List every party and, where they are directly elected, every candidate on the ballot for this election in",
      "   my constituency if I gave one, otherwise nationally. Ask me if the ballot is unclear.",
      "2. For each party, assign a score from −100 to +100 on each of the ten dimensions, plus a confidence of",
      "   high, medium or low, plus a one-line justification citing your sources.",
      "3. Use sources in this order of preference, and triangulate across at least two types where possible:",
      "   a. The party's current manifesto or programme for this election (what it is accountable for).",
      "   b. Academic expert placements and coded manifestos (for example the Manifesto Project, the Global",
      "      Party Survey, V-Party, or a regional expert survey that actually covers this country — check its",
      "      coverage before relying on it, as several are limited to Europe).",
      "   c. Party self-placements in voting-advice applications where parties answered the questions themselves.",
      "   d. Voting records and governing record from the last term.",
      "   e. Recent public statements by party leadership.",
      "   Avoid opinion pieces, campaign material from rivals, and social media as primary evidence.",
      "4. For candidates, score only where you have direct evidence (voting record, own statements, candidate",
      "   surveys). Otherwise inherit the party score and mark confidence low.",
      "   Check first how votes are actually recorded here: in some parliaments most divisions record only the",
      "   party and its vote count, so individual positions survive only on conscience votes, which cluster on a",
      "   couple of dimensions. Where that is so, say which dimensions you genuinely have candidate evidence for",
      "   and inherit the party score on the rest, rather than implying a full candidate profile.",
      "5. Where a party is vague or contradictory on a dimension, say so and give low confidence rather than",
      "   forcing a number. Where manifesto and governing record diverge, report both and say which you scored.",
      "6. Do not infer a position from a party's family, name or reputation. Every score needs a source.",
      "7. Distinguish how much a party talks about something from where it stands on it. Coded-manifesto datasets",
      "   mostly measure emphasis, not direction: a party can discuss the environment constantly while proposing",
      "   to weaken protections. Score direction, and use emphasis only as evidence of priority.",
      "",
      "## Step 2: match",
      "",
      "For each party, compute a weighted distance from my profile:",
      "- weight each dimension by the absolute value of my score (my strongest leanings matter most);",
      "- halve the weight of any dimension where my answers were marked mixed;",
      "- distance = sqrt( Σ weight × (my score − party score)² / Σ weight ).",
      "Rank parties by distance, lowest first. Where a candidate has their own scores, rank them separately.",
      "",
      "## Step 3: the electoral context",
      "",
      "Explain briefly how this election works and what each vote I cast can and cannot change: for example,",
      "whether there are separate party and candidate votes, thresholds, run-offs, or safe seats. Then, kept",
      "separate from the values match, note the strategic picture: current polling, likely coalitions, which",
      "parties have ruled each other out, and where a vote risks being wasted. Date every figure.",
      "",
      "## Step 4: report",
      "",
      "Write the report in this order:",
      "1. Summary: three or four sentences on which parties fit my values best, the main trade-off, and the",
      "   single most important strategic fact.",
      "2. Key findings: the handful of points where the parties genuinely diverge on my highest-priority",
      "   dimensions, each backed by dated evidence.",
      "3. Values scorecard: the full table of parties × ten dimensions with scores and confidence, then the",
      "   ranking by distance. Say which dimensions actually separated the parties and which did not.",
      "4. Party by party: for each party, its strongest agreements with me, its most important conflicts, and",
      "   what its governing record says where that differs from its programme. Give smaller parties less",
      "   weight where their published policy is too thin to judge, and say so.",
      "5. Candidates: where I have a candidate vote, assess the candidates separately on the same dimensions,",
      "   using direct evidence only, and say how much that vote can change.",
      "6. Strategic considerations, clearly separated from the values match.",
      "7. Staged reasoning rather than a single recommendation: \"if X is your top priority, then ...\" for my",
      "   two or three highest-priority dimensions, so I can see how the answer depends on what I weigh most.",
      "8. Caveats: where evidence is weak, contested or missing, and what you could not verify.",
      "9. What would change this analysis before election day, and any practical deadlines such as registration",
      "   or advance voting.",
      "10. Sources consulted, with dates and links.",
      "",
      "## Rules",
      "",
      "- Do not tell me how to vote. Map the evidence to my values and let me decide.",
      "- Be neutral. Do not editorialise about which values are better.",
      "- Distinguish clearly between what a source says and your own inference.",
      "- Apply confidence ratings equally to all parties; do not hold parties you favour to a lower standard.",
      "- Keep values, strategy and competence separate. Competence, leadership stability and coalition",
      "  prospects matter, but they are not part of the values match and should be reported on their own.",
      "- If you are uncertain, say so. An honest \"unknown\" is more useful than a confident guess.",
      "",
      "## My profile as JSON",
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
