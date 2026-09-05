#!/usr/bin/env node
// Generates sources.html: the source catalogue (data/sources-nz.json) and every archived
// document under research/nz/ (from the folder manifests), with links to originals and copies.
// Usage: node scripts/build-sources.js [--check]

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "sources.html");
const CATALOGUE = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "sources-nz.json"), "utf8"));
const { DIMENSIONS } = require(path.join(ROOT, "js", "data.js"));
const DIM = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d.poles.join(" vs. ")]));

const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const FOLDER_TITLES = { shared: "Shared records: coalition agreements, Hansard votes, statutory reports", national: "National", labour: "Labour", green: "Green Party", act: "ACT", nzfirst: "NZ First", maori: "Te Pāti Māori", top: "Opportunity (TOP)" };

function walkManifests(dir, rel) {
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (f.startsWith(".")) continue;
    const full = path.join(dir, f);
    if (!fs.statSync(full).isDirectory()) continue;
    const mp = path.join(full, "manifest.json");
    if (fs.existsSync(mp)) out.push({ rel: path.posix.join(rel, f), key: f, manifest: JSON.parse(fs.readFileSync(mp, "utf8")) });
    else out.push(...walkManifests(full, path.posix.join(rel, f)));
  }
  return out;
}

function catalogueSection() {
  const rows = CATALOGUE.sources.map((s) => `
      <tr>
        <td>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>` : esc(s.name)}${s.urls ? "<br><small>" + Object.entries(s.urls).map(([k, v]) => `<a href="${esc(v)}" target="_blank" rel="noopener">${esc(k)}</a>`).join(" · ") + "</small>" : ""}</td>
        <td>${esc(s.tier)}<br><small>${esc(s.category)}</small></td>
        <td>${esc(s.evidences)}${s.value ? `<br><small>${esc(s.value)}</small>` : ""}</td>
        <td><small>${(s.dimensions || []).map((d) => esc(DIM[d] || d)).join(", ") || "context"}</small></td>
        <td><small>${esc(s.confidence)}${s.editorialised ? "; editorialised" : ""}${s.redistributable === false ? "; not redistributable" : ""}</small></td>
      </tr>`).join("");
  const excluded = CATALOGUE.excluded.map((e) => `<li><b>${esc(e.name)}</b>${e.url ? ` (<a href="${esc(e.url)}" target="_blank" rel="noopener">link</a>)` : ""}: ${esc(e.reason)}</li>`).join("");
  const ctx = (CATALOGUE.contextSources && CATALOGUE.contextSources.sources || []).map((c) => `<li><b>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.name)}</a>` : esc(c.name)}</b>: ${esc(c.evidences)} ${esc(c.value || "")}</li>`).join("");
  return `
    <h2 id="catalogue">The source catalogue</h2>
    <p>${esc(CATALOGUE.purpose)} Version ${esc(CATALOGUE.version)}, compiled ${esc(CATALOGUE.compiledAt)}${CATALOGUE.reviewedAt ? ", reviewed " + esc(CATALOGUE.reviewedAt) : ""}. The full catalogue with access notes and licences is <a href="data/sources-nz.json">data/sources-nz.json</a>.</p>
    <h3>Neutrality standard</h3>
    <p><b>Included:</b> ${CATALOGUE.neutralityStandard.include.map(esc).join("; ")}.</p>
    <p><b>Excluded:</b> ${CATALOGUE.neutralityStandard.exclude.map(esc).join("; ")}.</p>
    <p>${esc(CATALOGUE.neutralityStandard.note)}</p>
    <div class="table-wrap"><table class="sources-table">
      <thead><tr><th>Source</th><th>Tier</th><th>What it evidences</th><th>Dimensions</th><th>Notes</th></tr></thead>
      <tbody>${rows}
      </tbody>
    </table></div>
    <h3>Context sources (not evidence of values)</h3>
    <ul>${ctx}</ul>
    <h3>Considered and excluded</h3>
    <ul>${excluded}</ul>`;
}

function archiveSection() {
  const folders = walkManifests(path.join(ROOT, "research", "nz"), "research/nz");
  const blocks = folders.map((f) => {
    const title = f.manifest.electorate ? `Electorate: ${f.manifest.electorate.replace(/-/g, " ")}` : (FOLDER_TITLES[f.key] || f.key);
    const items = f.manifest.entries.filter((e) => !e.filename.endsWith(".txt")).map((e) => {
      const copy = `${f.rel}/${e.filename}`;
      const orig = e.sourceUrl ? `<a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">original</a>` : "";
      const kind = e.kind ? `<span class="badge">${esc(e.kind)}</span>` : "";
      return `<li>${esc(e.title)} ${kind}<br><small>${e.date ? "dated " + esc(e.date) + " · " : ""}fetched ${esc(e.fetchedAt)} · ${orig}${orig ? " · " : ""}<a href="${esc(copy)}">archived copy</a>${e.notes ? "<br>" + esc(e.notes) : ""}</small></li>`;
    }).join("");
    return `<h3>${esc(title)} <small>(${f.manifest.entries.filter((e) => !e.filename.endsWith(".txt")).length} documents)</small></h3>${f.manifest.notes ? `<p class="help">${esc(f.manifest.notes)}</p>` : ""}<ul class="archive-list">${items}</ul>`;
  }).join("");
  return `
    <h2 id="archive">The research archive</h2>
    <p>Every document a party or candidate score rests on, as fetched, with the date it was fetched. Web pages are saved as retrieved; PDFs are stored as published. Party manifestos remain the parties' copyright and are held here for verification of the published scores.</p>
    ${blocks}`;
}

function build() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Values Compass: Sources</title>
  <meta name="description" content="Every source behind the Values Compass party and candidate scores: the catalogue of admitted sources, the reasons others were excluded, and an archive of every document used.">
  <link rel="canonical" href="https://www.onato.com/values-compass/sources.html">
  <meta name="theme-color" content="#2a78d6">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Values Compass">
  <meta property="og:title" content="Values Compass: Sources">
  <meta property="og:description" content="Every source behind the Values Compass party and candidate scores: the catalogue of admitted sources, the reasons others were excluded, and an archive of every document used.">
  <meta property="og:url" content="https://www.onato.com/values-compass/sources.html">
  <meta property="og:image" content="https://www.onato.com/values-compass/img/share.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Values Compass: find the parties that fit your values, and see the evidence.">
  <meta property="og:locale" content="en_NZ">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Values Compass: Sources">
  <meta name="twitter:description" content="Every source behind the Values Compass party and candidate scores: the catalogue of admitted sources, the reasons others were excluded, and an archive of every document used.">
  <meta name="twitter:image" content="https://www.onato.com/values-compass/img/share.png">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <main class="app prose sources-page">
    <p class="help"><a href="index.html">← Back to Values Compass</a></p>
    <h1>Sources</h1>
    <p class="lead">Everything the party and candidate scores rest on: the catalogue of sources we admit and why, and an archive of every document actually used. Generated from the project's data files; the JSON and the folder manifests are the authoritative record.</p>
    <p class="help">Contents: <a href="#catalogue">the source catalogue</a> · <a href="#archive">the research archive</a> · <a href="docs/party-scoring-rubric.md">the scoring rubric</a></p>
    ${catalogueSection()}
    ${archiveSection()}
  </main>
</body>
</html>
`;
}

const html = build();
if (process.argv.includes("--check")) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : "";
  if (current !== html) { console.error("sources.html is out of date; run node scripts/build-sources.js"); process.exit(1); }
  console.log("OK: sources.html in sync");
} else {
  fs.writeFileSync(OUT, html);
  console.log(`Wrote sources.html (${(html.length / 1024).toFixed(0)} KB)`);
}
