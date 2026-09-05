(function () {
  var STORAGE_KEY = "values-compass.v1";
  var RESULT_KEY = "values-compass.result.v1";

  var state = load() || freshState();
  var order = Scoring.shuffleItems(ITEMS, state.seed);

  // ---------- persistence ----------
  function freshState() {
    return { seed: (Math.random() * 0xffffffff) >>> 0, answers: {}, index: 0, importance: {}, otherConcerns: "", importanceAsked: false };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (typeof s.seed !== "number" || typeof s.answers !== "object") return null;
      if (!s.importance) s.importance = {};
      if (typeof s.otherConcerns !== "string") s.otherConcerns = "";
      return s;
    } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }
  function loadResult() {
    try { var r = localStorage.getItem(RESULT_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function saveResult(p) {
    if (sampleMode) return;
    try { localStorage.setItem(RESULT_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function clearAll() {
    try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(RESULT_KEY); } catch (e) {}
  }

  // ---------- DOM helpers ----------
  function $(id) { return document.getElementById(id); }
  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }
  var lastAssessScreen = "screen-intro";
  function show(id) {
    ["screen-intro", "screen-quiz", "screen-importance", "screen-results"].forEach(function (s) { $(s).hidden = s !== id; });
    lastAssessScreen = id;
    window.scrollTo(0, 0);
  }
  function answeredCount() { return Object.keys(state.answers).length; }

  // ---------- sample result ----------
  var sampleMode = false;
  // Answers for an imaginary person, built from target scores so the sample looks like a real profile.
  function sampleAnswers() {
    var targets = { solidarity: 40, regulation: 20, liberty: 50, tradition: -40, institutions: 30, cosmopolitan: 40,
                    environment: 80, diplomacy: 30, local: 40, change: 20, animals: 60, drugs: 40 };
    var patterns = { 80: [5, 5, 5, 4, 4], 60: [5, 4, 4, 4, 3], 50: [5, 4, 4, 3, 4], 40: [4, 4, 4, 4, 3], 30: [4, 4, 3, 3, 4], 20: [4, 3, 3, 4, 3], "-40": [2, 2, 2, 2, 3] };
    var answers = {};
    DIMENSIONS.forEach(function (d) {
      var keyedValues = patterns[String(targets[d.id])] || [3, 3, 3, 3, 3];
      ITEMS.filter(function (it) { return it.dim === d.id; }).forEach(function (it, i) {
        var v = keyedValues[i];
        answers[it.id] = it.key > 0 ? v : 6 - v;
      });
    });
    return answers;
  }
  function showSample() {
    var profile = Scoring.buildProfile(DIMENSIONS, ITEMS, sampleAnswers(), new Date(),
      { importance: { environment: "high", change: "low" }, otherConcerns: "housing affordability and how well the health system actually works" });
    sampleMode = true;
    document.body.classList.add("sample");
    $("sample-banner").hidden = false;
    $("results-title").textContent = "A sample values profile";
    $("summary").readOnly = true;
    $("btn-retake").textContent = "Start the questionnaire";
    renderResults(profile);
    show("screen-results");
  }
  function leaveSample() {
    sampleMode = false;
    document.body.classList.remove("sample");
    $("sample-banner").hidden = true;
    $("results-title").textContent = "Your values profile";
    $("summary").readOnly = false;
    $("btn-retake").textContent = "Retake";
  }

  // ---------- intro ----------
  function renderIntro() {
    var list = $("dim-list");
    list.innerHTML = "";
    DIMENSIONS.forEach(function (d) {
      list.appendChild(el("li", { html: "<b>" + d.poles[0] + " vs. " + d.poles[1] + "</b> — " + d.blurb }));
    });
    var inProgress = answeredCount() > 0 && answeredCount() < ITEMS.length;
    $("btn-resume").hidden = !inProgress;
    $("btn-start").textContent = inProgress ? "Start over" : "Start the questionnaire";
    $("btn-view-results").hidden = !loadResult();
  }

  // ---------- methodology ----------
  function renderMethod() {
    var dims = $("method-dims");
    dims.innerHTML = "";
    DIMENSIONS.forEach(function (d) {
      dims.appendChild(el("li", { html:
        "<b>" + d.poles[0] + " vs. " + d.poles[1] + ".</b> " +
        cap(d.describe[0]) + ", against " + d.describe[1] + "." }));
    });
    var groups = $("method-items");
    groups.innerHTML = "";
    DIMENSIONS.forEach(function (d) {
      var ul = el("ul");
      ITEMS.filter(function (it) { return it.dim === d.id; }).forEach(function (it) {
        ul.appendChild(el("li", null, [
          el("span", { class: "k", text: it.key > 0 ? "+" : "−" }),
          el("span", { text: it.text })
        ]));
      });
      groups.appendChild(el("div", { class: "item-group" }, [
        el("h3", { text: d.poles[0] + " vs. " + d.poles[1] }), ul
      ]));
    });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------- questionnaire ----------
  function renderQuestion() {
    var i = state.index;
    if (i >= order.length) { finish(); return; }
    var item = order[i];
    $("q-index").textContent = i + 1;
    $("q-total").textContent = order.length;
    $("statement").textContent = item.text;
    var pct = (answeredCount() / order.length) * 100;
    $("progress-fill").style.width = pct + "%";
    $("progress-fill").parentNode.setAttribute("aria-valuenow", answeredCount());
    $("btn-back").disabled = i === 0 || !!jumpTarget;
    $("hint-back").textContent = jumpTarget ? "Your new answer will update your results." : (i === 0 ? "" : "Use Back to change an earlier answer.");
    $("btn-quit").textContent = jumpTarget ? "Back to results without changing" : "Save and exit";

    var likert = $("likert");
    likert.innerHTML = "";
    SCALE.forEach(function (opt) {
      var b = el("button", {
        type: "button", role: "radio",
        "aria-checked": state.answers[item.id] === opt.value ? "true" : "false",
        "data-value": opt.value
      }, [el("span", { class: "num", text: String(opt.value) }), el("span", { text: opt.label })]);
      b.addEventListener("click", function () { answer(item, opt.value); });
      likert.appendChild(b);
    });
  }

  function answer(item, value) {
    state.answers[item.id] = value;
    if (jumpTarget) { save(); finish(); return; }
    state.index = Math.min(state.index + 1, order.length);
    save();
    renderQuestion();
  }

  function back() {
    if (state.index === 0) return;
    state.index -= 1;
    save();
    renderQuestion();
  }

  var jumpTarget = null; // item id when the person came from the results to change one answer

  function finish() {
    if (!state.importanceAsked && !jumpTarget) { showImportance(); return; }
    var profile = Scoring.buildProfile(DIMENSIONS, ITEMS, state.answers, null, { importance: state.importance, otherConcerns: state.otherConcerns });
    var previous = loadResult();
    if (profile && previous && previous.summaryEdited) {
      profile.summary = previous.summary;
      profile.summaryEdited = true;
      profile.summaryGenerated = Scoring.buildSummary(DIMENSIONS, profile.dimensions);
    }
    if (!profile) {
      // Shouldn't happen, but jump to the first unanswered item rather than dead-end.
      for (var i = 0; i < order.length; i++) {
        if (typeof state.answers[order[i].id] !== "number") { state.index = i; save(); renderQuestion(); return; }
      }
      return;
    }
    saveResult(profile);
    renderResults(profile);
    show("screen-results");
    if (jumpTarget) {
      var item = ITEMS.filter(function (i) { return i.id === jumpTarget; })[0];
      jumpTarget = null;
      var row = item && document.querySelector('.row-dim[data-dim="' + item.dim + '"]');
      if (row) { row.open = true; row.scrollIntoView({ block: "start" }); }
    }
  }

  // ---------- importance and other concerns ----------
  function showImportance() {
    var list = $("importance-list");
    list.innerHTML = "";
    DIMENSIONS.forEach(function (d) {
      var choices = el("div", { class: "choices", role: "radiogroup", "aria-label": "How much " + d.poles[0] + " vs. " + d.poles[1] + " matters" });
      IMPORTANCE.forEach(function (o) {
        var b = el("button", { type: "button", role: "radio", "aria-checked": (state.importance[d.id] || "normal") === o.value ? "true" : "false", text: o.label });
        b.addEventListener("click", function () {
          state.importance[d.id] = o.value; save();
          choices.querySelectorAll("button").forEach(function (q) { q.setAttribute("aria-checked", q === b ? "true" : "false"); });
        });
        choices.appendChild(b);
      });
      var scored = Scoring.scoreDimension(d, ITEMS, state.answers);
      var body = el("div", { class: "dim-detail" });
      body.appendChild(el("p", { html: "<b>" + d.poles[0] + "</b>: " + cap(d.describe[0]) + "." }));
      body.appendChild(el("p", { html: "<b>" + d.poles[1] + "</b>: " + cap(d.describe[1]) + "." }));
      if (scored) body.appendChild(el("p", { class: "you-lean", text: "Your answers: " + fmtLean(scored.score, d) + (scored.strength === "balanced" ? "" : " (" + scored.strength + ")") + (scored.consistency === "mixed" ? ", mixed" : "") + "." }));
      list.appendChild(el("div", { class: "importance-row", "data-dim": d.id }, [
        el("span", { class: "dim-name", text: d.poles[0] + " vs. " + d.poles[1] }),
        choices,
        body
      ]));
    });
    $("other-concerns").value = state.otherConcerns || "";
    show("screen-importance");
  }
  $("btn-importance-done").addEventListener("click", function () {
    state.otherConcerns = $("other-concerns").value.trim(); state.importanceAsked = true; save(); finish();
  });
  $("btn-importance-skip").addEventListener("click", function () {
    state.importanceAsked = true; save(); finish();
  });
  $("link-importance").addEventListener("click", function () { showImportance(); });

  // From the results: go to one question, answer it, come straight back.
  function jumpToItem(itemId) {
    var idx = order.map(function (i) { return i.id; }).indexOf(itemId);
    if (idx < 0) return;
    jumpTarget = itemId;
    state.index = idx;
    save();
    show("screen-quiz");
    renderQuestion();
  }

  // ---------- results ----------
  var current = null;

  function renderResults(profile) {
    current = profile;
    var byId = {};
    DIMENSIONS.forEach(function (d) { byId[d.id] = d; });
    var chart = $("chart");
    chart.innerHTML = "";

    profile.priorities.forEach(function (id) {
      var s = profile.dimensions.filter(function (x) { return x.id === id; })[0];
      var d = byId[id];
      var half = Math.abs(s.score) / 2; // percent of full track width
      var side = s.score > 0 ? "a" : "b";
      var poles = el("div", { class: "poles" }, [
        el("span", { class: s.score > 0 && s.strength !== "balanced" ? "active" : "", text: d.poles[0] }),
        el("span", { class: s.score < 0 && s.strength !== "balanced" ? "active" : "", text: d.poles[1] })
      ]);
      if (s.consistency === "mixed") {
        poles.firstChild.appendChild(el("span", { class: "badge", text: "mixed" }));
      }
      poles.firstChild.appendChild(importancePill(d, s));
      var track = el("div", { class: "track", tabindex: "0",
        title: d.poles[0] + " vs. " + d.poles[1] + ": " + fmtLean(s.score, d) + " (" + s.strength + (s.consistency === "mixed" ? ", mixed" : "") + ")",
        "aria-label": d.poles[0] + " versus " + d.poles[1] + ", " + fmtLean(s.score, d) + ", " + s.strength });
      track.appendChild(el("div", { class: "axis" }));
      if (s.score !== 0) {
        var bar = el("div", { class: "bar " + side + (s.consistency === "mixed" ? " mixed" : "") });
        bar.style.width = half + "%";
        track.appendChild(bar);
      }
      // Pole A bars grow leftward from the axis, pole B bars rightward. The label
      // sits just past the bar's outer end, or inside it when there is no room.
      var inside = half > 40;
      var val = el("div", { class: "val" + (inside ? " inside" : ""), text: String(Math.abs(s.score)) });
      if (s.score > 0) {
        if (inside) val.style.left = (50 - half) + "%"; else val.style.right = (50 + half) + "%";
      } else {
        if (inside) val.style.right = (50 - half) + "%"; else val.style.left = (50 + half) + "%";
      }
      track.appendChild(val);
      var row = el("details", { class: "row-dim", "data-dim": d.id }, [el("summary", null, [poles, track]), renderWhy(d, s)]);
      chart.appendChild(row);
    });

    chart.appendChild(el("div", { class: "legend", html:
      '<span><i class="sw a"></i>Towards the left pole</span>' +
      '<span><i class="sw b"></i>Towards the right pole</span>' +
      '<span><i class="sw m"></i>Mixed answers, less certain</span>' }));

    var tbody = $("score-table").querySelector("tbody");
    tbody.innerHTML = "";
    profile.priorities.forEach(function (id) {
      var s = profile.dimensions.filter(function (x) { return x.id === id; })[0];
      tbody.appendChild(el("tr", null, [
        el("td", { text: s.poles[0] + " vs. " + s.poles[1] }),
        el("td", { text: s.leaning || "—" }),
        el("td", { class: "num", text: String(Math.abs(s.score)) }),
        el("td", { text: s.strength }),
        el("td", { text: s.consistency })
      ]));
    });

    $("summary").value = profile.summary;
    var stale = $("summary-stale");
    stale.hidden = !(profile.summaryEdited && profile.summaryGenerated && profile.summaryGenerated !== profile.summary);
    renderParties(profile);
    renderElectorates(profile);
    refreshJson();
  }

  // ---------- party alignment ----------
  function partiesAvailable() {
    return typeof PARTIES_NZ !== "undefined" && PARTIES_NZ.parties && PARTIES_NZ.parties.length > 0;
  }

  function renderParties(profile) {
    var section = $("party-section");
    if (!partiesAvailable()) { section.hidden = true; return; }
    section.hidden = false;
    var byId = {};
    DIMENSIONS.forEach(function (d) { byId[d.id] = d; });
    var parties = PARTIES_NZ.parties;
    var meta = PARTIES_NZ.meta;
    var ranking = Matching.matchParties(profile, parties);
    var partyById = {};
    parties.forEach(function (p) { partyById[p.id] = p; });

    $("party-intro").textContent = "New Zealand, " + meta.election + ". " + parties.length +
      (parties.length === 1 ? " party" : " parties") + " scored so far, assessed " + meta.assessedAt +
      " under rubric v" + meta.rubricVersion + ". Ranked by how closely each sits to your profile.";

    var list = $("party-ranking");
    list.innerHTML = "";
    ranking.forEach(function (r) {
      var party = partyById[r.id];
      var agree = r.agreements.map(function (id) { return byId[id].poles.join(" vs. "); });
      var conflict = r.conflicts.map(function (id) { return byId[id].poles.join(" vs. "); });
      var drivers = el("div", { class: "drivers" });
      drivers.appendChild(el("span", { html: "<b>Closest on</b> " + (agree.length ? agree.join(", ") : "nothing in particular") + ". " }));
      drivers.appendChild(el("span", { html: "<b>Furthest on</b> " + (conflict.length ? conflict.join(", ") : "no dimension by 30 points or more") + "." }));
      var sw = el("i", { class: "sw", "aria-hidden": "true" }); sw.style.background = party.colour;
      var summary = el("summary", null, [
        el("span", { class: "rank", text: r.rank + "." }),
        el("span", { class: "party-name" }, [sw, el("span", { text: party.name })]),
        el("span", { class: "align", html: r.adjusted + "% aligned<small>confidence " + r.confidence + (r.scoredDimensions < DIMENSIONS.length ? ", " + r.scoredDimensions + " of " + DIMENSIONS.length + " scored (" + r.alignment + "% on those)" : "") + "</small>" }),
        drivers
      ]);
      var cells = el("div", { class: "cells" });
      cells.appendChild(el("p", { class: "intro", text: "Your position is the bar; " + party.short + "'s is the dot. Dimensions in the order they matter to you." }));
      profile.priorities.forEach(function (id) {
        cells.appendChild(renderCell(byId[id], profile.dimensions.filter(function (x) { return x.id === id; })[0], party));
      });
      list.appendChild(el("details", { class: "party-card" }, [summary, cells]));
    });

    var disc = Matching.discriminatingDimensions(DIMENSIONS.map(function (d) { return d.id; }), parties);
    if (parties.length >= 2) {
      var top = disc.slice(0, 3).map(function (d) { return byId[d.id].poles.join(" vs. "); });
      var flat = disc.filter(function (d) { return d.spread < 30 && d.scored > 0; }).map(function (d) { return byId[d.id].poles.join(" vs. "); });
      $("party-discriminators").textContent = "The parties differ most on " + joinNatural(top) + "." +
        (flat.length ? " They barely differ on " + joinNatural(flat) + ", so those dimensions do little to separate them." : "");
    } else {
      $("party-discriminators").textContent = "Once more parties are scored, this line will say which dimensions actually separate them.";
    }
    $("method-parties").textContent = "Currently scored: " + parties.map(function (p) { return p.short; }).join(", ") +
      ". Latest assessment " + meta.assessedAt + ", rubric v" + meta.rubricVersion + ".";
  }

  // ---------- electorates ----------
  var ELECTORATE_KEY = "values-compass.electorate";
  function electoratesAvailable() {
    return typeof ELECTORATES_NZ !== "undefined" && ELECTORATES_NZ.electorates && ELECTORATES_NZ.electorates.length > 0;
  }
  function renderElectorates(profile) {
    var section = $("electorate-section");
    if (!electoratesAvailable()) { section.hidden = true; return; }
    section.hidden = false;
    var sel = $("electorate-select");
    if (sel.options.length <= 1) {
      ELECTORATES_NZ.electorates.forEach(function (e) { sel.appendChild(el("option", { value: e.id, text: e.name })); });
      var saved = null;
      try { saved = localStorage.getItem(ELECTORATE_KEY); } catch (e) {}
      // With a single researched electorate, show it by default rather than an empty choice.
      if (saved) sel.value = saved;
      else if (ELECTORATES_NZ.electorates.length === 1) sel.value = ELECTORATES_NZ.electorates[0].id;
      sel.addEventListener("change", function () {
        try { localStorage.setItem(ELECTORATE_KEY, sel.value); } catch (e) {}
        if (current) { renderCandidates(current, sel.value); refreshJson(); }
      });
    }
    renderCandidates(profile, sel.value);
    $("method-electorates").textContent = "Electorates researched so far: " + ELECTORATES_NZ.electorates.map(function (e) { return e.name + " (" + e.candidates.length + " candidates, assessed " + e.assessedAt + ")"; }).join("; ") + ".";
  }
  function selectedElectorate() {
    if (!electoratesAvailable()) return null;
    var id = $("electorate-select").value;
    return ELECTORATES_NZ.electorates.filter(function (e) { return e.id === id; })[0] || null;
  }
  function renderCandidates(profile, id) {
    var e = ELECTORATES_NZ.electorates.filter(function (x) { return x.id === id; })[0];
    var ctx = $("electorate-context"), list = $("candidate-ranking");
    list.innerHTML = "";
    if (!e) { ctx.hidden = true; return; }
    var byId = {};
    DIMENSIONS.forEach(function (d) { byId[d.id] = d; });
    var r23 = e.context.result2023;
    ctx.hidden = false;
    ctx.innerHTML = "";
    ctx.appendChild(el("p", { html: "<b>Incumbent.</b> " + e.context.incumbent }));
    if (r23) {
      var cv = r23.candidateVote.map(function (v) { return v.candidate + " (" + v.party + ") " + v.percent + "%"; }).join(", ");
      var pv = r23.partyVote.map(function (v) { return v.party + " " + v.percent + "%"; }).join(", ");
      ctx.appendChild(el("p", { html: "<b>2023 result.</b> Candidate vote: " + cv + ", majority " + r23.majority + ". Party vote: " + pv + "." }));
    }
    ctx.appendChild(el("p", { html: "<b>What this vote changes.</b> " + e.context.whatTheVoteChanges }));
    if (e.context.localIssues) ctx.appendChild(el("p", { html: "<b>Local issues.</b> " + e.context.localIssues }));
    ctx.appendChild(el("p", { class: "help", text: "Assessed " + e.assessedAt + " (" + e.status + "). " + (e.notes || "") }));

    var ranking = Matching.matchParties(profile, e.candidates);
    ranking.forEach(function (r) {
      var cand = e.candidates.filter(function (c) { return c.id === r.id; })[0];
      var own = DIMENSIONS.filter(function (d) { return cand.dimensions[d.id] && cand.dimensions[d.id].basis === "candidate"; }).length;
      var agree = r.agreements.map(function (id) { return byId[id].poles.join(" vs. "); });
      var conflict = r.conflicts.map(function (id) { return byId[id].poles.join(" vs. "); });
      var drivers = el("div", { class: "drivers" });
      drivers.appendChild(el("span", { html: "<b>Closest on</b> " + (agree.length ? agree.join(", ") : "nothing in particular") + ". " }));
      drivers.appendChild(el("span", { html: "<b>Furthest on</b> " + (conflict.length ? conflict.join(", ") : "no dimension by 30 points or more") + "." }));
      var sw = el("i", { class: "sw", "aria-hidden": "true" }); sw.style.background = cand.colour;
      var summary = el("summary", null, [
        el("span", { class: "rank", text: r.rank + "." }),
        el("span", { class: "party-name" }, [sw, el("span", { html: cand.name + " <small>" + cand.partyName + "</small>" })]),
        el("span", { class: "align", html: (r.scoredDimensions ? r.adjusted + "% aligned" : "not scored") + "<small>" +
          (r.scoredDimensions ? "confidence " + r.confidence + ", " : "") + r.scoredDimensions + " of " + DIMENSIONS.length + " scored" +
          (r.scoredDimensions && r.scoredDimensions < DIMENSIONS.length ? " (" + r.alignment + "% on those)" : "") + ", " + own + " from own statements</small>" }),
        drivers,
        el("div", { class: "bio", text: cand.bio })
      ]);
      var cells = el("div", { class: "cells" });
      cells.appendChild(el("p", { class: "intro", text: "Your position is the bar; " + cand.short + "'s is the dot. Cells marked 'own statements' are scored from what the candidate has said; the rest inherit the party." }));
      profile.priorities.forEach(function (id) {
        cells.appendChild(renderCell(byId[id], profile.dimensions.filter(function (x) { return x.id === id; })[0], cand));
      });
      list.appendChild(el("details", { class: "party-card" }, [summary, cells]));
    });
  }

  function renderCell(d, pd, party) {
    var cell = party.dimensions[d.id];
    var wrap = el("div", { class: "cell" });
    var half = Math.abs(pd.score) / 2;
    wrap.appendChild(el("div", { class: "poles" }, [
      el("span", { html: pd.score > 0 && pd.strength !== "balanced" ? "<b>" + d.poles[0] + "</b>" : d.poles[0] }),
      el("span", { html: pd.score < 0 && pd.strength !== "balanced" ? "<b>" + d.poles[1] + "</b>" : d.poles[1] })
    ]));
    var track = el("div", { class: "track", "aria-label": d.poles[0] + " versus " + d.poles[1] + ": you " + fmtLean(pd.score, d) + (cell && typeof cell.score === "number" ? ", " + party.short + " " + fmtLean(cell.score, d) : "") });
    track.appendChild(el("div", { class: "axis" }));
    if (pd.score !== 0) {
      var bar = el("div", { class: "bar " + (pd.score > 0 ? "a" : "b") + (pd.consistency === "mixed" ? " mixed" : "") });
      bar.style.width = half + "%";
      track.appendChild(bar);
    }
    if (cell && typeof cell.score === "number") {
      var m = el("div", { class: "marker", title: party.short + ": " + fmtLean(cell.score, d) });
      // Pole A is the left end, so +100 sits at 0% and -100 at 100%.
      m.style.left = (50 - cell.score / 2) + "%";
      m.style.background = party.colour;
      track.appendChild(m);
    }
    wrap.appendChild(track);
    var meta = el("div", { class: "cell-meta" });
    meta.appendChild(el("span", { class: "you", text: "You: " + fmtLean(pd.score, d) + (pd.consistency === "mixed" ? " (mixed)" : "") }));
    if (cell && typeof cell.score === "number") {
      var ps = el("span", { class: "party", text: party.short + ": " + fmtLean(cell.score, d) });
      ps.style.setProperty("--marker", party.colour);
      meta.appendChild(ps);
      meta.appendChild(el("span", { class: "badge" + (cell.confidence === "low" ? " low" : ""), text: "confidence " + cell.confidence }));
      if (cell.mixed) meta.appendChild(el("span", { class: "badge split", title: "The party's evidence pulls both ways on this dimension; the score is the net direction and counts as less certain.", text: "split position" }));
      if (cell.basis === "candidate") meta.appendChild(el("span", { class: "badge basis-candidate", text: "own statements" }));
      if (cell.basis === "party") meta.appendChild(el("span", { class: "badge basis-party", text: "inherited from the party" }));
    } else {
      meta.appendChild(el("span", { class: "nodata", text: party.short + ": " + (cell && cell.basis === "none" ? "not scored" : "no discernible position") }));
    }
    wrap.appendChild(meta);
    if (cell) {
      wrap.appendChild(el("p", { class: "rationale", text: cell.rationale }));
      if (cell.sources && cell.sources.length) {
        var ul = el("ul", { class: "sources" });
        cell.sources.forEach(function (s) {
          var li = el("li");
          if (s.url) li.appendChild(el("a", { href: s.url, target: "_blank", rel: "noopener", text: s.title }));
          else li.appendChild(el("span", { text: s.title }));
          if (s.date) li.appendChild(document.createTextNode(" (" + s.date + ")"));
          if (s.archived) { li.appendChild(document.createTextNode(" · ")); li.appendChild(el("a", { href: s.archived, target: "_blank", rel: "noopener", text: "archived copy" })); }
          if (s.quote) li.appendChild(el("span", { text: " — \u201c" + s.quote + "\u201d" }));
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }
    }
    return wrap;
  }

  function joinNatural(xs) {
    if (xs.length <= 1) return xs.join("");
    return xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1];
  }

  // A clickable pill showing how much the dimension matters; clicking steps to the next level and re-scores.
  var IMPORTANCE_LABEL = { low: "matters less", normal: "matters", high: "matters a lot" };
  function importancePill(d, s) {
    var level = s.importance || "normal";
    var pill = el("button", { type: "button", class: "badge importance-" + level,
      title: "How much this dimension counts in matching. Click to change it.", text: IMPORTANCE_LABEL[level] });
    pill.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (sampleMode) return;
      showImportance();
      var row = document.querySelector('.importance-row[data-dim="' + d.id + '"]');
      if (row) { row.scrollIntoView({ block: "center" }); row.classList.add("highlight"); var b = row.querySelector('button[aria-checked="true"]'); if (b) b.focus(); }
    });
    return pill;
  }

  // Explains one dimension's score from the five answers behind it.
  function renderWhy(d, s) {
    var box = el("div", { class: "why" });
    if (!s.responses || !s.responses.length) {
      box.appendChild(el("p", { class: "help", text: "The individual answers behind this score were not saved with this result. Retake the questionnaire to see them." }));
      return box;
    }
    var labels = {};
    SCALE.forEach(function (o) { labels[o.value] = o.label; });
    box.appendChild(el("p", { class: "help", html: "Each statement is answered from 1 (strongly disagree) to 5 (strongly agree). Statements phrased from the <b>" + d.poles[1] + "</b> side are reverse-keyed, so agreeing with them counts towards " + d.poles[1] + ". After keying, 5 always means fully " + d.poles[0] + "." }));
    var ul = el("ul", { class: "answers" });
    s.responses.forEach(function (r) {
      var toward = r.keyed >= 4 ? d.poles[0] : r.keyed <= 2 ? d.poles[1] : "neither pole";
      var li = el("li");
      li.appendChild(el("span", { class: "statement-text", text: r.text }));
      var ans = el("span", { class: "answer", html: "You answered <b>" + labels[r.response] + "</b>" +
        (r.key < 0 ? " (reverse-keyed, counts as " + r.keyed + " of 5)" : " (" + r.keyed + " of 5)") +
        ", towards " + toward + ". " });
      if (!sampleMode && typeof state.answers[r.id] === "number") {
        var change = el("button", { class: "link inline", type: "button", text: "Change answer" });
        change.addEventListener("click", function () { jumpToItem(r.id); });
        ans.appendChild(change);
      }
      li.appendChild(ans);
      ul.appendChild(li);
    });
    box.appendChild(ul);
    var mean = typeof s.mean === "number" ? s.mean : null;
    box.appendChild(el("p", { class: "help", html: "Average of the keyed answers: <b>" + (mean === null ? "?" : mean) + "</b> of 5. Distance from the midpoint = (average − 3) ÷ 2 × 100 = <b>" + fmtLean(s.score, d) + "</b>, which reads as \"" + s.strength + (s.leaning ? " " + s.leaning : "") + "\"." +
      (s.consistency === "mixed" ? " Your answers pointed in different directions (spread " + s.sd + "), so this score is marked mixed and counts for less in matching." : "") }));
    return box;
  }

  function fmt(n) { return (n > 0 ? "+" : "") + n; }
  // Human display: a strength towards a named pole, never a signed number.
  function fmtLean(score, d) {
    if (score > 0) return score + " towards " + d.poles[0];
    if (score < 0) return (-score) + " towards " + d.poles[1];
    return "0, balanced";
  }

  function exportProfile() {
    var p = JSON.parse(JSON.stringify(current));
    p.summary = $("summary").value.trim();
    // Drop the raw sd; it's an internal detail.
    p.dimensions.forEach(function (d) { delete d.sd; delete d.mean; delete d.responses; });
    delete p.summaryEdited; delete p.summaryGenerated;
    if (partiesAvailable()) {
      p.partyMatch = Matching.exportBlock(Matching.matchParties(current, PARTIES_NZ.parties), PARTIES_NZ.meta);
      var e = selectedElectorate();
      if (e) {
        var cr = Matching.matchParties(current, e.candidates);
        p.partyMatch.electorate = { id: e.id, name: e.name, assessedAt: e.assessedAt,
          ranking: cr.map(function (r) { var c = e.candidates.filter(function (x) { return x.id === r.id; })[0];
            return { rank: r.rank, candidate: c.name, party: c.partyName, alignment: r.adjusted, alignmentOnScored: r.scoredDimensions ? r.alignment : null, coverage: r.coverage, confidence: r.confidence, scoredDimensions: r.scoredDimensions }; }) };
      }
    }
    return p;
  }
  function promptOpts() {
    return { country: $("ctx-country").value, election: $("ctx-election").value };
  }
  function refreshJson() {
    $("json").textContent = JSON.stringify(exportProfile(), null, 2);
    $("prompt").textContent = Scoring.buildPrompt(exportProfile(), DIMENSIONS, promptOpts());
  }

  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.textContent = ""; }, 2500);
  }

  function copy(text, label) {
    function fallback() {
      var ta = el("textarea", { text: text });
      ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) {}
      document.body.removeChild(ta);
      toast(ok ? label + " copied." : "Copy failed. Open \"Show JSON\" and copy manually.");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(label + " copied."); }, fallback);
    } else fallback();
  }

  function download() {
    var p = exportProfile();
    var blob = new Blob([JSON.stringify(p, null, 2)], { type: "application/json" });
    var a = el("a", { href: URL.createObjectURL(blob), download: "values-profile-" + p.completedAt.slice(0, 10) + ".json" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast("Download started.");
  }

  // ---------- wiring ----------
  function startQuestionnaire() {
    leaveSample();
    if (answeredCount() > 0 && !confirm("Start over and discard your current answers?")) return;
    state = freshState(); order = Scoring.shuffleItems(ITEMS, state.seed); save();
    show("screen-quiz"); renderQuestion();
  }
  $("btn-sample").addEventListener("click", showSample);
  $("btn-sample-2").addEventListener("click", showSample);
  $("btn-sample-start").addEventListener("click", startQuestionnaire);
  $("btn-start").addEventListener("click", function () {
    if (answeredCount() > 0 && !confirm("Start over and discard your current answers?")) return;
    state = freshState(); order = Scoring.shuffleItems(ITEMS, state.seed); save();
    show("screen-quiz"); renderQuestion();
  });
  $("btn-resume").addEventListener("click", function () { leaveSample(); show("screen-quiz"); renderQuestion(); });
  $("btn-view-results").addEventListener("click", function () {
    var r = loadResult(); if (!r) return;
    leaveSample(); renderResults(r); show("screen-results");
  });
  $("btn-back").addEventListener("click", back);
  $("btn-quit").addEventListener("click", function () {
    save();
    if (jumpTarget) { jumpTarget = null; var r = loadResult(); if (r) { renderResults(r); show("screen-results"); return; } }
    renderIntro(); show("screen-intro");
  });
  $("btn-copy-json").addEventListener("click", function () { copy(JSON.stringify(exportProfile(), null, 2), "JSON"); });
  $("btn-copy-prompt").addEventListener("click", function () { copy(Scoring.buildPrompt(exportProfile(), DIMENSIONS, promptOpts()), "Prompt"); });
  $("btn-download").addEventListener("click", download);
  $("btn-retake").addEventListener("click", function () {
    if (sampleMode) { startQuestionnaire(); return; }
    if (!confirm("Discard these results and start again?")) return;
    clearAll(); state = freshState(); order = Scoring.shuffleItems(ITEMS, state.seed); save();
    show("screen-quiz"); renderQuestion();
  });
  var CTX_DEFAULTS = { "ctx-country": "New Zealand", "ctx-election": "General election, 7 November 2026" };
  ["ctx-country", "ctx-election"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      refreshJson();
      try { localStorage.setItem("values-compass.ctx." + id, $(id).value); } catch (e) {}
    });
    var saved = null;
    try { saved = localStorage.getItem("values-compass.ctx." + id); } catch (e) {}
    $(id).value = saved === null ? CTX_DEFAULTS[id] : saved;
  });
  $("summary").addEventListener("input", function () {
    refreshJson();
    if (current) { current.summary = $("summary").value; current.summaryEdited = true; saveResult(current); }
  });
  $("btn-regenerate-summary").addEventListener("click", function () {
    if (!current) return;
    current.summary = Scoring.buildSummary(DIMENSIONS, current.dimensions);
    delete current.summaryEdited; delete current.summaryGenerated;
    saveResult(current); $("summary").value = current.summary; $("summary-stale").hidden = true; refreshJson();
  });
  document.addEventListener("keydown", function (e) {
    if ($("screen-quiz").hidden) return;
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
    if (e.key >= "1" && e.key <= "5") { answer(order[state.index], Number(e.key)); e.preventDefault(); }
    else if (e.key === "Backspace" || e.key === "ArrowLeft") { back(); e.preventDefault(); }
  });

  $("link-method").addEventListener("click", function () {
    if (sampleMode) leaveSample();
    renderIntro(); show("screen-intro");
    var m = $("methodology"); if (m) m.scrollIntoView({ block: "start" });
  });

  renderIntro();
  renderMethod();
  show("screen-intro");
})();
