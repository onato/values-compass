(function () {
  var STORAGE_KEY = "values-compass.v1";
  var RESULT_KEY = "values-compass.result.v1";

  var state = load() || freshState();
  var order = Scoring.shuffleItems(ITEMS, state.seed);

  // ---------- persistence ----------
  function freshState() {
    return { seed: (Math.random() * 0xffffffff) >>> 0, answers: {}, index: 0 };
  }
  function load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (typeof s.seed !== "number" || typeof s.answers !== "object") return null;
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
  function show(id) {
    ["screen-intro", "screen-quiz", "screen-results"].forEach(function (s) { $(s).hidden = s !== id; });
    window.scrollTo(0, 0);
  }
  function answeredCount() { return Object.keys(state.answers).length; }

  // ---------- intro ----------
  function renderIntro() {
    var list = $("dim-list");
    list.innerHTML = "";
    DIMENSIONS.forEach(function (d) {
      list.appendChild(el("li", { html: "<b>" + d.poles[0] + " vs. " + d.poles[1] + "</b> — " + d.blurb }));
    });
    var inProgress = answeredCount() > 0 && answeredCount() < ITEMS.length;
    $("btn-resume").hidden = !inProgress;
    $("btn-start").textContent = inProgress ? "Start over" : "Start";
    $("btn-view-results").hidden = !loadResult();
  }

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
    $("btn-back").disabled = i === 0;
    $("hint-back").textContent = i === 0 ? "" : "Use Back to change an earlier answer.";

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

  function finish() {
    var profile = Scoring.buildProfile(DIMENSIONS, ITEMS, state.answers);
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
      var track = el("div", { class: "track", tabindex: "0",
        title: d.poles[0] + " vs. " + d.poles[1] + ": " + fmt(s.score) + " (" + s.strength + (s.consistency === "mixed" ? ", mixed" : "") + ")",
        "aria-label": d.poles[0] + " versus " + d.poles[1] + ", score " + fmt(s.score) + ", " + s.strength });
      track.appendChild(el("div", { class: "axis" }));
      if (s.score !== 0) {
        var bar = el("div", { class: "bar " + side + (s.consistency === "mixed" ? " mixed" : "") });
        bar.style.width = half + "%";
        track.appendChild(bar);
      }
      // Pole A bars grow leftward from the axis, pole B bars rightward. The label
      // sits just past the bar's outer end, or inside it when there is no room.
      var inside = half > 40;
      var val = el("div", { class: "val" + (inside ? " inside" : ""), text: fmt(s.score) });
      if (s.score > 0) {
        if (inside) val.style.left = (50 - half) + "%"; else val.style.right = (50 + half) + "%";
      } else {
        if (inside) val.style.right = (50 - half) + "%"; else val.style.left = (50 + half) + "%";
      }
      track.appendChild(val);
      chart.appendChild(el("div", { class: "row-dim" }, [poles, track]));
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
        el("td", { class: "num", text: fmt(s.score) }),
        el("td", { text: s.strength }),
        el("td", { text: s.consistency })
      ]));
    });

    $("summary").value = profile.summary;
    refreshJson();
  }

  function fmt(n) { return (n > 0 ? "+" : "") + n; }

  function exportProfile() {
    var p = JSON.parse(JSON.stringify(current));
    p.summary = $("summary").value.trim();
    // Drop the raw sd; it's an internal detail.
    p.dimensions.forEach(function (d) { delete d.sd; });
    return p;
  }
  function refreshJson() {
    $("json").textContent = JSON.stringify(exportProfile(), null, 2);
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
  $("btn-start").addEventListener("click", function () {
    if (answeredCount() > 0 && !confirm("Start over and discard your current answers?")) return;
    state = freshState(); order = Scoring.shuffleItems(ITEMS, state.seed); save();
    show("screen-quiz"); renderQuestion();
  });
  $("btn-resume").addEventListener("click", function () { show("screen-quiz"); renderQuestion(); });
  $("btn-view-results").addEventListener("click", function () {
    var r = loadResult(); if (!r) return;
    renderResults(r); show("screen-results");
  });
  $("btn-back").addEventListener("click", back);
  $("btn-quit").addEventListener("click", function () { save(); renderIntro(); show("screen-intro"); });
  $("btn-copy-json").addEventListener("click", function () { copy(JSON.stringify(exportProfile(), null, 2), "JSON"); });
  $("btn-copy-prompt").addEventListener("click", function () { copy(Scoring.buildPrompt(exportProfile()), "Prompt"); });
  $("btn-download").addEventListener("click", download);
  $("btn-retake").addEventListener("click", function () {
    if (!confirm("Discard these results and start again?")) return;
    clearAll(); state = freshState(); order = Scoring.shuffleItems(ITEMS, state.seed); save();
    show("screen-quiz"); renderQuestion();
  });
  $("summary").addEventListener("input", function () {
    refreshJson();
    if (current) { current.summary = $("summary").value; saveResult(current); }
  });
  document.addEventListener("keydown", function (e) {
    if ($("screen-quiz").hidden) return;
    if (e.target && (e.target.tagName === "TEXTAREA" || e.target.tagName === "INPUT")) return;
    if (e.key >= "1" && e.key <= "5") { answer(order[state.index], Number(e.key)); e.preventDefault(); }
    else if (e.key === "Backspace" || e.key === "ArrowLeft") { back(); e.preventDefault(); }
  });

  renderIntro();
  show("screen-intro");
})();
