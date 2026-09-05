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
    var responses = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it.dim !== dim.id) continue;
      var r = answers[it.id];
      if (typeof r !== "number") return null;
      var v = keyValue(it, r);
      keyed.push(v);
      responses.push({ id: it.id, text: it.text, response: r, key: it.key, keyed: v });
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
      sd: Math.round(sd * 100) / 100,
      mean: Math.round(m * 100) / 100,
      responses: responses
    };
  }

  var IMPORTANCE_MULT = { low: 0.5, normal: 1, high: 1.5 };

  // Weight of a dimension for ordering and matching: how far the person leans (with a
  // floor) times how much they said it matters to their vote.
  function priorityWeight(s) {
    return Math.max(Math.abs(s.score), 10) * (IMPORTANCE_MULT[s.importance] || 1);
  }

  // extras: { importance: { dimensionId: "low"|"normal"|"high" }, otherConcerns: string }
  function buildProfile(dimensions, items, answers, now, extras) {
    extras = extras || {};
    var imp = extras.importance || {};
    var scored = dimensions.map(function (d) {
      var s = scoreDimension(d, items, answers);
      if (s) s.importance = IMPORTANCE_MULT[imp[d.id]] ? imp[d.id] : "normal";
      return s;
    });
    if (scored.some(function (s) { return s === null; })) return null;
    var priorities = scored.slice().sort(function (a, b) {
      return priorityWeight(b) - priorityWeight(a) || Math.abs(b.score) - Math.abs(a.score);
    }).map(function (s) { return s.id; });
    var other = (extras.otherConcerns || "").trim();
    var profile = {
      version: "1.1",
      completedAt: (now || new Date()).toISOString(),
      scale: { min: -100, max: 100, positiveMeans: "pole A (first-listed pole)" },
      dimensions: scored,
      priorities: priorities,
      summary: ""
    };
    if (other) profile.otherConcerns = other;
    profile.summary = buildSummary(dimensions, scored, other);
    return profile;
  }

  function buildSummary(dimensions, scored, otherConcerns) {
    var byId = {};
    dimensions.forEach(function (d) { byId[d.id] = d; });
    var ordered = scored.slice().sort(function (a, b) {
      return priorityWeight(b) - priorityWeight(a) || Math.abs(b.score) - Math.abs(a.score);
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
    var high = scored.filter(function (s) { return s.importance === "high"; }).map(function (s) { return byId[s.id].poles[0] + " vs. " + byId[s.id].poles[1]; });
    var low = scored.filter(function (s) { return s.importance === "low"; }).map(function (s) { return byId[s.id].poles[0] + " vs. " + byId[s.id].poles[1]; });
    if (high.length) lines.push("What matters most to my vote is " + joinNatural(high) + ".");
    if (low.length) lines.push(joinNatural(low) + (low.length === 1 ? " matters" : " matter") + " less to my vote.");
    if (otherConcerns) lines.push("Beyond these dimensions, I also care about: " + otherConcerns);
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
      return (i + 1) + ". " + d.poles[0] + " vs. " + d.poles[1] + ". " +
        d.poles[0] + ": " + d.describe[0] + ". " + d.poles[1] + ": " + d.describe[1] + ".";
    });

    var profileLines = profile.priorities.map(function (id) {
      var s = profile.dimensions.filter(function (x) { return x.id === id; })[0];
      var d = byId[id];
      var where = s.score > 0 ? s.score + " towards " + d.poles[0] : s.score < 0 ? (-s.score) + " towards " + d.poles[1] : "balanced";
      var notes = [];
      if (s.score !== 0) notes.push(s.strength);
      if (s.consistency === "mixed") notes.push("my answers were mixed, so treat this as less certain");
      if (s.importance === "high") notes.push("matters a lot to my vote");
      if (s.importance === "low") notes.push("matters less to my vote");
      return "- " + d.poles[0] + " vs. " + d.poles[1] + ": " + where + (notes.length ? " (" + notes.join("; ") + ")" : "");
    });
    var otherSection = profile.otherConcerns ? [
      "",
      "## Other things I care about",
      "",
      "These are not covered by the twelve dimensions. Research each party's position on them too, report them in",
      "their own section, and do not fold them into the dimension scores:",
      profile.otherConcerns
    ] : [];

    return [
      "# Task: match political parties and candidates to my values",
      "",
      "I completed a values self-assessment. Your job is to research the parties and candidates on my ballot,",
      "place each of them on the same twelve value dimensions I was scored on, and then rank them by how well they",
      "match me. Work independently from your own research and show your evidence; I want a second opinion I can",
      "check, so do not rely on any other ranking of these parties you may have seen.",
      "",
      "Country: " + country,
      "Election: " + election,
      "",
      "## My values profile",
      "",
      "In my own words: " + profile.summary,
      "",
      "Where I stand on each dimension, as a strength from 0 to 100 towards one of its two poles, listed in priority",
      "order (how strongly I lean, weighted by how much I said each dimension matters to my vote):",
      profileLines.join("\n")].concat(otherSection).concat([
      "",
      "## The twelve dimensions",
      "",
      "Each dimension is a scale between two poles. These are values, not policies. Score by what a party's positions",
      "reveal about its priorities when values conflict.",
      "",
      dimLines.join("\n"),
      "",
      "## Step 1: research and score the parties and candidates",
      "",
      "1. List every party and, where they are directly elected, every candidate on the ballot for this election in",
      "   my constituency if I gave one, otherwise nationally. Ask me if the ballot is unclear.",
      "2. For each party, place it on each of the twelve dimensions as a strength from 0 to 100 towards one pole, the",
      "   same way my profile is written, with a confidence of high, medium or low and a one-line justification",
      "   citing your sources.",
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
      "For each party, compute a weighted distance from my profile. Treat each position as a number from −100 to",
      "+100, positive towards the first-named pole, negative towards the second:",
      "- weight each dimension by the size of my number (my strongest leanings matter most),",
      "  multiplied by 1.5 where I said it matters a lot and by 0.5 where I said it matters less;",
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
      "3. Values scorecard: the full table of parties × twelve dimensions with scores and confidence, then the",
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
      ""
    ]).join("\n");
  }

  // ---- Compact, URL-safe encoding of everything needed to rebuild a result ----
  // v1.<answers as one digit per item in ITEMS order>.<importance as l/n/h per dimension>.<other concerns>.<edited summary>
  // Text fields are base64url of UTF-8 and may be empty.
  function b64e(str) {
    if (!str) return "";
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64d(str) {
    if (!str) return "";
    var b = str.replace(/-/g, "+").replace(/_/g, "/");
    while (b.length % 4) b += "=";
    var bin = atob(b), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  var IMP_CODE = { low: "l", normal: "n", high: "h" }, IMP_DECODE = { l: "low", n: "normal", h: "high" };

  function encodeResult(items, dimensions, data) {
    var digits = items.map(function (it) { var r = data.answers[it.id]; return r >= 1 && r <= 5 ? String(r) : "0"; }).join("");
    var imp = dimensions.map(function (d) { return IMP_CODE[(data.importance || {})[d.id]] || "n"; }).join("");
    return ["v1", digits, imp, b64e(data.otherConcerns || ""), b64e(data.summary || "")].join(".");
  }
  function decodeResult(items, dimensions, code) {
    var parts = (code || "").split(".");
    if (parts[0] !== "v1" || parts.length < 3) return null;
    var digits = parts[1], imp = parts[2];
    if (digits.length !== items.length) return null;
    var answers = {}, importance = {};
    for (var i = 0; i < items.length; i++) { var r = Number(digits[i]); if (r >= 1 && r <= 5) answers[items[i].id] = r; }
    if (Object.keys(answers).length !== items.length) return null;
    dimensions.forEach(function (d, i) { importance[d.id] = IMP_DECODE[imp[i]] || "normal"; });
    var other = "", summary = "";
    try { other = b64d(parts[3] || ""); summary = b64d(parts[4] || ""); } catch (e) { return null; }
    return { answers: answers, importance: importance, otherConcerns: other, summary: summary };
  }

  return {
    encodeResult: encodeResult,
    decodeResult: decodeResult,
    keyValue: keyValue,
    strengthLabel: strengthLabel,
    scoreDimension: scoreDimension,
    buildProfile: buildProfile,
    buildSummary: buildSummary,
    shuffleItems: shuffleItems,
    buildPrompt: buildPrompt,
    priorityWeight: priorityWeight,
    IMPORTANCE_MULT: IMPORTANCE_MULT,
    stddev: stddev,
    MIXED_SD: MIXED_SD
  };
})();

if (typeof module !== "undefined") {
  module.exports = Scoring;
}
