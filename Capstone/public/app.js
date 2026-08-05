/* ProcureWise SPA — vanilla JS, no build step. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

let DATA = null;   // { state, scoring, metrics }
let HEALTH = null; // { ai: {enabled, mode, model} }
let VIEW = "overview";

const VIEW_META = {
  overview: ["Overview", "From scattered quotations to a reviewable recommendation."],
  quotations: ["Quotations", "Standardise messy vendor quotes into one comparable format."],
  criteria: ["Criteria & Weights", "Tune what matters — scoring recomputes instantly and transparently."],
  comparison: ["Comparison", "Deterministic, auditable scoring across every criterion."],
  recommendation: ["Recommendation & Review", "AI explains; a named human approves. The system never buys."],
  emails: ["Clarification Emails", "Draft polite vendor follow-ups — always reviewed before sending."],
  policy: ["Policy Q&A", "Answers grounded only in the company procurement policy."],
  audit: ["Audit Trail", "Every human decision, with rationale, for accountability."],
};

/* ---------------- utilities ---------------- */
function fmtINR(n, compact = false) {
  n = Math.round(Number(n) || 0);
  if (compact && Math.abs(n) >= 100000) {
    if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
    return `₹${(n / 100000).toFixed(2)} L`;
  }
  const s = Math.abs(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${n < 0 ? "-" : ""}₹${grouped}`;
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function md(text) {
  // minimal markdown -> HTML
  const lines = String(text || "").split("\n");
  let html = "", inList = false;
  const inline = (s) => esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^_])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
  for (let raw of lines) {
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) {
      if (inList) { html += "</ul>"; inList = false; }
      const level = line.match(/^#+/)[0].length;
      html += `<h${Math.min(level + 1, 4)}>${inline(line.replace(/^#+\s/, ""))}</h${Math.min(level + 1, 4)}>`;
    } else if (/^[-*]\s/.test(line)) {
      if (!inList) { html += "<ul>"; inList = true; }
      html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`;
    } else if (line.trim() === "") {
      if (inList) { html += "</ul>"; inList = false; }
    } else if (/^---+$/.test(line.trim())) {
      if (inList) { html += "</ul>"; inList = false; }
      html += "<hr/>";
    } else {
      if (inList) { html += "</ul>"; inList = false; }
      html += `<p>${inline(line)}</p>`;
    }
  }
  if (inList) html += "</ul>";
  return html;
}
function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg;
  t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.className = "toast"), 2600);
}
async function api(path, method = "GET", body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
function modeChip(mode) {
  return `<span class="mode-chip ${mode}">${mode === "claude" ? "⚡ Claude" : "◇ deterministic"}</span>`;
}
function refreshFromStatePayload(payload) {
  if (payload && payload.state && payload.scoring) DATA = payload;
}

/* ---------------- boot ---------------- */
async function boot() {
  try {
    HEALTH = await api("/api/health");
    DATA = await api("/api/state");
  } catch (e) {
    $("#content").innerHTML = `<div class="card"><p>Could not reach the server: ${esc(e.message)}</p></div>`;
    return;
  }
  const badge = $("#ai-badge");
  if (HEALTH.ai.enabled) {
    badge.className = "ai-badge live";
    badge.textContent = `⚡ Live AI · ${HEALTH.ai.model}`;
  } else {
    badge.className = "ai-badge";
    badge.textContent = "◇ AI: deterministic mode";
  }
  $("#topbar-scenario").innerHTML = `
    <div><b>${esc(DATA.state.scenario.company)}</b></div>
    <div>${esc(DATA.state.scenario.category)} · ${DATA.state.scenario.quantity} units</div>`;

  $$("#nav .nav-item").forEach((b) =>
    b.addEventListener("click", () => setView(b.dataset.view)));
  $("#reset-btn").addEventListener("click", async () => {
    if (!confirm("Restore the original demo scenario? This clears added vendors and decisions.")) return;
    DATA = await api("/api/reset", "POST");
    toast("Demo scenario restored");
    render();
  });
  render();
}
function setView(v) {
  VIEW = v;
  $$("#nav .nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  render();
}
function render() {
  const [title, sub] = VIEW_META[VIEW];
  $("#view-title").textContent = title;
  $("#view-sub").textContent = sub;
  const c = $("#content");
  ({
    overview: renderOverview,
    quotations: renderQuotations,
    criteria: renderCriteria,
    comparison: renderComparison,
    recommendation: renderRecommendation,
    emails: renderEmails,
    policy: renderPolicy,
    audit: renderAudit,
  })[VIEW](c);
}

/* ---------------- OVERVIEW ---------------- */
function renderOverview(c) {
  const { scoring, metrics, state } = DATA;
  const rec = scoring.rows.find((r) => r.id === scoring.recommendedId);
  const latest = state.decisions[state.decisions.length - 1];
  c.innerHTML = `
    <div class="grid cols-4">
      ${kpi("Quotations compared", String(scoring.rows.length), "standardised into one format")}
      ${kpi("Recommended vendor", rec ? esc(rec.name) : "—", rec ? `score ${rec.totalScore}/100` : "", "accent")}
      ${kpi("Fleet cost (TCO)", rec ? fmtINR(rec.tco, true) : "—", rec ? `${fmtINR(rec.tcoPerUnit)}/unit` : "")}
      ${kpi("Est. saving vs budget", metrics ? fmtINR(metrics.savingsVsBudget, true) : "—", metrics ? `${metrics.savingsVsBudgetPct}% under budget` : "", "good")}
    </div>

    <div class="card">
      <div class="rec-banner">
        <div class="rec-medal">🏆</div>
        <div style="flex:1">
          <div class="muted" style="margin:0">System recommendation${scoring.recommendationBlocked ? " (blocked — see compliance)" : ""}</div>
          <div class="big">${rec ? esc(rec.name) : "No compliant vendor"}</div>
          <div class="muted" style="margin-top:2px">${rec ? esc(rec.product) : ""}</div>
        </div>
        <div style="text-align:right">
          <button class="btn" onclick="setView('recommendation')">Review &amp; decide →</button>
          <div class="muted" style="margin-top:8px">${latest ? `Last decision: <b>${esc(latest.action)}</b> → ${esc(latest.vendorName || "—")}` : "Awaiting human decision"}</div>
        </div>
      </div>
    </div>

    <div class="grid cols-2">
      <div class="card">
        <h2 class="section">Vendor comparison</h2>
        <p class="sub">Weighted score across ${state.criteria.length} criteria (deterministic).</p>
        ${miniTable(scoring)}
      </div>
      <div class="card">
        <h2 class="section">The engagement</h2>
        <p class="sub">${esc(state.scenario.buyer)}</p>
        <p style="margin-top:0">${esc(state.scenario.requirementSummary)}</p>
        <div class="divider"></div>
        <h3>How ProcureWise splits the work</h3>
        <div class="compliance-list">
          <div><span class="dot ok"></span> <b>Deterministic engine</b> — standardisation, TCO, weighted scoring, compliance gating (reproducible, auditable).</div>
          <div><span class="dot ok"></span> <b>Generative AI</b> — reads messy quotes, explains the recommendation, drafts emails, answers policy questions.</div>
          <div><span class="dot no"></span> <b>Never automated</b> — no purchase order or financial commitment. A named human approves every award.</div>
        </div>
      </div>
    </div>`;
}
function kpi(label, value, foot, cls = "") {
  return `<div class="card kpi ${cls}"><div class="label">${esc(label)}</div><div class="value">${value}</div><div class="foot">${esc(foot)}</div></div>`;
}
function miniTable(scoring) {
  const max = Math.max(...scoring.rows.map((r) => r.totalScore), 1);
  return `<table><thead><tr><th>Vendor</th><th class="num">TCO</th><th style="width:180px">Score</th><th></th></tr></thead><tbody>
    ${scoring.rows.map((r) => `<tr class="${r.id === scoring.recommendedId ? "recommended" : ""}">
      <td><span class="pill rank">#${r.rank}</span> ${esc(r.name)}</td>
      <td class="num">${fmtINR(r.tco, true)}</td>
      <td><div class="row" style="gap:8px"><div class="scorebar ${r.id === scoring.recommendedId ? "win" : ""}" style="flex:1"><span style="width:${(r.totalScore / max) * 100}%"></span></div><b style="width:34px">${r.totalScore}</b></div></td>
      <td>${r.compliant ? '<span class="pill good">✓ compliant</span>' : '<span class="pill bad">✗ gap</span>'}</td>
    </tr>`).join("")}
  </tbody></table>`;
}

/* ---------------- QUOTATIONS ---------------- */
function renderQuotations(c) {
  const { state, scoring } = DATA;
  c.innerHTML = `
    <div class="card">
      <div class="spread">
        <div><h2 class="section">Standardised quotations</h2><p class="sub" style="margin:0">${state.vendors.length} vendors · quotes arrived as email, PDF text and spreadsheet.</p></div>
      </div>
    </div>
    <div class="grid cols-3" id="vendor-grid">
      ${state.vendors.map((v) => vendorCard(v, scoring)).join("")}
    </div>

    <div class="card">
      <h2 class="section">📥 Add a quotation — paste raw text, let AI standardise it</h2>
      <p class="sub">Paste an email, a pasted PDF quote, or a spreadsheet dump. ${HEALTH.ai.enabled ? "Claude extracts the fields." : "The deterministic parser extracts the fields (no API key set)."}</p>
      <div class="grid cols-2">
        <div>
          <label class="field">Raw quotation text</label>
          <textarea id="raw-quote" rows="10" placeholder="Paste vendor quotation here…"></textarea>
          <div class="row" style="margin-top:10px">
            <button class="btn" id="parse-btn">✨ Parse with AI</button>
            <button class="btn btn-line btn-sm" id="sample-btn">Load a sample quote</button>
          </div>
        </div>
        <div>
          <label class="field">Parsed result (review before adding)</label>
          <div id="parse-out" class="empty" style="border:1px dashed var(--line);border-radius:12px">Parsed fields will appear here for your review.</div>
        </div>
      </div>
    </div>`;

  $("#parse-btn").addEventListener("click", onParse);
  $("#sample-btn").addEventListener("click", () => {
    $("#raw-quote").value = SAMPLE_QUOTE;
  });
  $$("#vendor-grid [data-del]").forEach((b) =>
    b.addEventListener("click", async () => {
      if (!confirm("Remove this vendor from the comparison?")) return;
      DATA = await api(`/api/vendors/${encodeURIComponent(b.dataset.del)}`, "DELETE");
      toast("Vendor removed");
      render();
    }));
}
function vendorCard(v, scoring) {
  const row = scoring.rows.find((r) => r.id === v.id);
  const comp = DATA.state.complianceChecklist;
  return `<div class="card vendor-card">
    <button class="btn btn-danger btn-sm del" data-del="${esc(v.id)}" title="Remove">✕</button>
    <div class="row" style="justify-content:flex-start;gap:8px">
      <span class="pill rank">#${row ? row.rank : "?"}</span>
      <span class="tag">${esc(v.source)}</span>
      ${row && !row.compliant ? '<span class="pill bad">compliance gap</span>' : '<span class="pill good">compliant</span>'}
    </div>
    <h3 style="margin:10px 0 2px">${esc(v.name)}</h3>
    <div class="muted" style="margin:0 0 10px">${esc(v.product || "—")}</div>
    <div class="metric-line"><span>Unit price</span><b>${fmtINR(v.unitPrice)}</b></div>
    <div class="metric-line"><span>Freight</span><b>${v.shipping ? fmtINR(v.shipping) : "Free"}</b></div>
    <div class="metric-line"><span>Fleet TCO</span><b>${row ? fmtINR(row.tco) : "—"}</b></div>
    <div class="metric-line"><span>Delivery</span><b>${v.deliveryDays} days</b></div>
    <div class="metric-line"><span>Warranty</span><b>${v.warrantyMonths} mo</b></div>
    <div class="metric-line"><span>Quality</span><b>${v.qualityRating}/5</b></div>
    <div class="metric-line"><span>Support SLA</span><b>${v.supportSlaHours} h</b></div>
    <div class="metric-line"><span>Payment</span><b>Net ${v.paymentTermsDays}</b></div>
    <div class="divider"></div>
    <div class="compliance-list">
      ${comp.map((ci) => `<div><span class="dot ${v.compliance[ci.key] ? "ok" : ci.mandatory ? "no" : "opt"}"></span>${esc(ci.label)}${ci.mandatory ? "" : ' <span class="tag">optional</span>'}</div>`).join("")}
    </div>
  </div>`;
}
async function onParse() {
  const raw = $("#raw-quote").value.trim();
  const out = $("#parse-out");
  if (!raw) { toast("Paste a quotation first", true); return; }
  $("#parse-btn").disabled = true;
  out.className = "";
  out.innerHTML = `<div class="row"><span class="spinner"></span> Extracting fields…</div>`;
  try {
    const r = await api("/api/parse-quote", "POST", { rawText: raw });
    const v = r.vendor;
    window._parsed = v;
    out.className = "";
    out.innerHTML = `
      <div class="spread" style="margin-bottom:10px">
        <div><b>${esc(v.name)}</b> ${modeChip(r.mode)}</div>
      </div>
      ${r.warning ? `<div class="flag-note">AI call failed, used fallback: ${esc(r.warning)}</div>` : ""}
      <div class="grid cols-2" style="gap:6px 16px">
        ${field("Unit price", fmtINR(v.unitPrice))}
        ${field("Freight", v.shipping ? fmtINR(v.shipping) : "Free")}
        ${field("Delivery", v.deliveryDays + " days")}
        ${field("Warranty", v.warrantyMonths + " months")}
        ${field("Support SLA", v.supportSlaHours + " h")}
        ${field("Payment", "Net " + v.paymentTermsDays)}
      </div>
      <div class="compliance-list" style="margin-top:10px">
        ${["dataSecurityCert","gstRegistered","onsiteSupportIN","msmeRegistered"].map((k) => `<div><span class="dot ${v.compliance[k] ? "ok" : "no"}"></span>${labelForCompliance(k)}</div>`).join("")}
      </div>
      <div class="row" style="margin-top:14px">
        <button class="btn" id="add-parsed">➕ Add to comparison</button>
      </div>`;
    $("#add-parsed").addEventListener("click", async () => {
      DATA = await api("/api/vendors", "POST", { vendor: window._parsed });
      toast("Vendor added to comparison");
      render();
    });
  } catch (e) {
    out.innerHTML = `<div class="flag-note">${esc(e.message)}</div>`;
  } finally {
    const b = $("#parse-btn"); if (b) b.disabled = false;
  }
}
function field(l, v) { return `<div class="metric-line"><span>${esc(l)}</span><b>${esc(v)}</b></div>`; }
function labelForCompliance(k) {
  return (DATA.state.complianceChecklist.find((c) => c.key === k) || {}).label || k;
}

/* ---------------- CRITERIA ---------------- */
function renderCriteria(c) {
  const { state } = DATA;
  const total = state.criteria.reduce((s, x) => s + Number(x.weight), 0);
  c.innerHTML = `
    <div class="grid cols-2">
      <div class="card">
        <h2 class="section">Scoring criteria & weights</h2>
        <p class="sub">Drag to set importance. Scores recompute live. Total weight: <b id="wtotal">${total}</b>.</p>
        <div id="sliders">
          ${state.criteria.map((cr) => `
            <div class="range-row">
              <div><label class="field" style="margin:0">${esc(cr.label)}</label><span class="tag">${cr.direction === "lower" ? "lower is better" : "higher is better"}</span></div>
              <input type="range" min="0" max="40" step="1" value="${cr.weight}" data-key="${cr.key}">
              <b data-w="${cr.key}">${cr.weight}%</b>
            </div>`).join("")}
        </div>
        <div class="divider"></div>
        <div class="row">
          <label class="field" style="margin:0">Budget / unit (baseline)</label>
          <input type="number" id="budget" value="${state.scenario.budgetPerUnit}" style="width:140px">
          <button class="btn btn-line btn-sm" id="save-budget">Update baseline</button>
        </div>
        <p class="muted">Savings are measured against this budgeted unit price.</p>
      </div>
      <div class="card">
        <h2 class="section">Live ranking</h2>
        <p class="sub">Recomputed deterministically as you change weights.</p>
        <div id="live-rank">${miniTable(DATA.scoring)}</div>
        <div class="divider"></div>
        <p class="muted">Try setting <b>Unit price</b> to max and others low — the cheapest <i>compliant</i> vendor rises, but a non-compliant vendor is still never recommended.</p>
      </div>
    </div>`;

  let t;
  $$("#sliders input[type=range]").forEach((r) =>
    r.addEventListener("input", () => {
      $(`[data-w="${r.dataset.key}"]`).textContent = r.value + "%";
      $("#wtotal").textContent = $$("#sliders input[type=range]").reduce((s, x) => s + Number(x.value), 0);
      clearTimeout(t);
      t = setTimeout(applyWeights, 250);
    }));
  $("#save-budget").addEventListener("click", async () => {
    DATA = await api("/api/scenario", "PUT", { budgetPerUnit: Number($("#budget").value) });
    toast("Baseline updated");
    $("#live-rank").innerHTML = miniTable(DATA.scoring);
  });
}
async function applyWeights() {
  const criteria = $$("#sliders input[type=range]").map((r) => ({ key: r.dataset.key, weight: Number(r.value) }));
  DATA = await api("/api/criteria", "PUT", { criteria });
  $("#live-rank").innerHTML = miniTable(DATA.scoring);
}

/* ---------------- COMPARISON ---------------- */
function renderComparison(c) {
  const { scoring, state } = DATA;
  const crit = state.criteria;
  c.innerHTML = `
    <div class="card">
      <div class="spread">
        <div><h2 class="section">Full comparison matrix</h2><p class="sub" style="margin:0">Per-criterion normalised score (0–100) × weight. Highlighted row = recommended.</p></div>
        <button class="btn btn-line btn-sm" id="export-btn">⬇ Export decision memo</button>
      </div>
      <div style="overflow-x:auto;margin-top:14px">
      <table>
        <thead><tr>
          <th>#</th><th>Vendor</th>
          ${crit.map((cr) => `<th class="num">${esc(cr.label)}<br><span class="tag">${cr.weight}%</span></th>`).join("")}
          <th class="num">Total</th><th>Compliance</th>
        </tr></thead>
        <tbody>
          ${scoring.rows.map((r) => `<tr class="${r.id === scoring.recommendedId ? "recommended" : ""}">
            <td><span class="pill rank">${r.rank}</span></td>
            <td><b>${esc(r.name)}</b><div class="muted" style="margin:0">${fmtINR(r.tco)} TCO</div></td>
            ${crit.map((cr) => {
              const b = r.breakdown[cr.key];
              return `<td class="num"><div>${formatVal(b.value, cr)}</div><div class="tag">${b.normalized}→${b.weighted}</div></td>`;
            }).join("")}
            <td class="num"><b style="font-size:15px">${r.totalScore}</b></td>
            <td>${r.compliant ? '<span class="pill good">✓ pass</span>' : `<span class="pill bad">✗ ${esc(r.complianceGaps.join(", "))}</span>`}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      </div>
      <p class="muted">Each cell shows the raw value, then <b>normalised→weighted</b> contribution. The total is the sum of weighted contributions — fully reproducible.</p>
      ${scoring.recommendationBlocked ? `<div class="review-note" style="margin-top:10px">⚠ The top-scoring vendor fails a mandatory compliance check, so it cannot be awarded as-is. The highest-scoring <b>compliant</b> vendor is recommended instead.</div>` : ""}
    </div>`;
  $("#export-btn").addEventListener("click", exportMemo);
}
function formatVal(v, cr) {
  if (cr.key === "unitPrice") return fmtINR(v, true);
  if (cr.unit === "/5") return v + "/5";
  return v + " " + (cr.unit || "");
}
async function exportMemo() {
  const { markdown } = await api("/api/export");
  const blob = new Blob([markdown], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "procurement-decision-memo.md";
  a.click();
  toast("Decision memo downloaded");
}

/* ---------------- RECOMMENDATION & REVIEW ---------------- */
function renderRecommendation(c) {
  const { scoring, state, metrics } = DATA;
  const rec = scoring.rows.find((r) => r.id === scoring.recommendedId);
  c.innerHTML = `
    <div class="grid cols-2">
      <div class="stack">
        <div class="card">
          <div class="spread">
            <h2 class="section">AI recommendation summary</h2>
            <button class="btn btn-sm" id="gen-explain">${state.decisions.length ? "Regenerate" : "Generate"} explanation</button>
          </div>
          <p class="sub">Plain-language rationale built from the scoring table.</p>
          <div id="explain-out" class="empty" style="border:1px dashed var(--line);border-radius:12px">Click “Generate explanation”.</div>
        </div>
      </div>

      <div class="stack">
        <div class="card">
          <h2 class="section">🧑‍⚖️ Human decision (required)</h2>
          <p class="sub">ProcureWise cannot place an order. Record an accountable human decision below.</p>
          <div class="review-box">
            <label class="field">Award to</label>
            <select id="dec-vendor">
              ${scoring.rows.map((r) => `<option value="${esc(r.id)}" ${r.id === scoring.recommendedId ? "selected" : ""}>${esc(r.name)} — score ${r.totalScore}${r.compliant ? "" : " (compliance gap)"}</option>`).join("")}
            </select>
            <div id="override-warn"></div>
            <label class="field" style="margin-top:12px">Decision</label>
            <select id="dec-action">
              <option value="approve">Approve recommendation</option>
              <option value="override">Override — award a different vendor</option>
              <option value="reject">Reject all — re-tender</option>
            </select>
            <label class="field" style="margin-top:12px">Approver name</label>
            <input type="text" id="dec-by" placeholder="e.g. R. Menon, Category Manager">
            <label class="field" style="margin-top:12px">Rationale</label>
            <textarea id="dec-reason" rows="3" placeholder="Why this decision? (kept in the audit trail)"></textarea>
            <div class="row" style="margin-top:12px">
              <button class="btn" id="record-dec">Record decision</button>
              <span class="muted">No PO is issued — this only records the human sign-off.</span>
            </div>
          </div>
        </div>
        <div class="card">
          <h3>Key numbers</h3>
          <div class="metric-line"><span>Recommended</span><b>${rec ? esc(rec.name) : "—"}</b></div>
          <div class="metric-line"><span>Score</span><b>${rec ? rec.totalScore + "/100" : "—"}</b></div>
          <div class="metric-line"><span>Fleet TCO</span><b>${rec ? fmtINR(rec.tco) : "—"}</b></div>
          <div class="metric-line"><span>Saving vs budget</span><b>${metrics ? fmtINR(metrics.savingsVsBudget) + ` (${metrics.savingsVsBudgetPct}%)` : "—"}</b></div>
          <div class="metric-line"><span>Saving vs costliest quote</span><b>${metrics ? fmtINR(metrics.savingsVsWorst) + ` (${metrics.savingsVsWorstPct}%)` : "—"}</b></div>
        </div>
      </div>
    </div>`;

  $("#gen-explain").addEventListener("click", async () => {
    const out = $("#explain-out");
    out.className = ""; out.innerHTML = `<div class="row"><span class="spinner"></span> Generating…</div>`;
    try {
      const r = await api("/api/recommendation/explain", "POST");
      out.className = "ai-out";
      out.innerHTML = `<div style="margin-bottom:8px">${modeChip(r.mode)}</div>${md(r.text)}`;
    } catch (e) { out.innerHTML = `<div class="flag-note">${esc(e.message)}</div>`; }
  });

  const updateOverride = () => {
    const vid = $("#dec-vendor").value;
    const action = $("#dec-action").value;
    const warn = $("#override-warn");
    if (action === "reject") { warn.innerHTML = ""; return; }
    if (vid !== scoring.recommendedId) {
      warn.innerHTML = `<div class="flag-note">This differs from the system recommendation — it will be logged as an override.</div>`;
      $("#dec-action").value = "override";
    } else {
      warn.innerHTML = "";
      if (action === "override") $("#dec-action").value = "approve";
    }
  };
  $("#dec-vendor").addEventListener("change", updateOverride);
  $("#dec-action").addEventListener("change", updateOverride);

  $("#record-dec").addEventListener("click", async () => {
    const body = {
      vendorId: $("#dec-action").value === "reject" ? null : $("#dec-vendor").value,
      action: $("#dec-action").value,
      decidedBy: $("#dec-by").value,
      reason: $("#dec-reason").value,
    };
    if (!body.decidedBy.trim()) { toast("Enter the approver name", true); return; }
    if (!body.reason.trim()) { toast("Add a short rationale for the audit trail", true); return; }
    try {
      const r = await api("/api/decision", "POST", body);
      refreshFromStatePayload(r);
      toast("Decision recorded in audit trail");
      setView("audit");
    } catch (e) { toast(e.message, true); }
  });
}

/* ---------------- EMAILS ---------------- */
function renderEmails(c) {
  const { state } = DATA;
  c.innerHTML = `
    <div class="card">
      <h2 class="section">✉️ Draft a clarification / negotiation email</h2>
      <p class="sub">Generate a professional follow-up. It is a draft for your review — nothing is sent, and no commitment is made.</p>
      <div class="grid cols-2">
        <div>
          <label class="field">Vendor</label>
          <select id="email-vendor">${state.vendors.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join("")}</select>
          <label class="field" style="margin-top:12px">Points to raise (one per line, optional — leave blank for smart defaults)</label>
          <textarea id="email-q" rows="6" placeholder="e.g. Can you extend payment terms to Net 45?"></textarea>
          <div class="row" style="margin-top:10px"><button class="btn" id="gen-email">Generate draft</button></div>
        </div>
        <div>
          <label class="field">Draft (review before sending)</label>
          <div id="email-out" class="empty" style="border:1px dashed var(--line);border-radius:12px">The generated email will appear here.</div>
        </div>
      </div>
    </div>`;
  $("#gen-email").addEventListener("click", async () => {
    const out = $("#email-out");
    const questions = $("#email-q").value.split("\n").map((s) => s.trim()).filter(Boolean);
    out.className = ""; out.innerHTML = `<div class="row"><span class="spinner"></span> Drafting…</div>`;
    try {
      const r = await api("/api/clarification-email", "POST", { vendorId: $("#email-vendor").value, questions });
      out.className = "";
      out.innerHTML = `<div class="spread" style="margin-bottom:8px">${modeChip(r.mode)}<button class="btn btn-line btn-sm" id="copy-email">Copy</button></div>
        <div class="code-preview" style="background:#f8faff;color:var(--ink);border:1px solid #e2ebff">${esc(r.text)}</div>`;
      $("#copy-email").addEventListener("click", () => { navigator.clipboard?.writeText(r.text); toast("Copied to clipboard"); });
    } catch (e) { out.innerHTML = `<div class="flag-note">${esc(e.message)}</div>`; }
  });
}

/* ---------------- POLICY Q&A ---------------- */
const POLICY_SUGGESTIONS = [
  "Do vendors handling customer data need ISO 27001?",
  "Who approves a purchase of 95 lakh rupees?",
  "What is the minimum warranty for IT hardware?",
  "How many quotations are required above 5 lakh?",
  "Can the system place a purchase order automatically?",
];
function renderPolicy(c) {
  const { state } = DATA;
  c.innerHTML = `
    <div class="grid cols-2">
      <div class="card">
        <h2 class="section">📜 Ask the procurement policy</h2>
        <p class="sub">Answers are grounded only in the policy document — with clause references.</p>
        <div class="suggest">${POLICY_SUGGESTIONS.map((q) => `<button data-q="${esc(q)}">${esc(q)}</button>`).join("")}</div>
        <div class="qa-list" id="qa-list"></div>
        <div class="row">
          <input type="text" id="qa-input" placeholder="Ask a policy question…" style="flex:1">
          <button class="btn" id="qa-send">Ask</button>
        </div>
      </div>
      <div class="card">
        <h3>Procurement policy (knowledge base)</h3>
        <div class="code-preview" style="max-height:520px">${esc(state.procurementPolicy)}</div>
      </div>
    </div>`;
  const ask = async (q) => {
    if (!q.trim()) return;
    const list = $("#qa-list");
    const item = document.createElement("div");
    item.className = "qa-item";
    item.innerHTML = `<div class="qa-q">🙋 ${esc(q)}</div><div class="qa-a"><span class="spinner"></span> Searching policy…</div>`;
    list.appendChild(item);
    try {
      const r = await api("/api/policy-qa", "POST", { question: q });
      item.querySelector(".qa-a").innerHTML = `<div style="margin-bottom:6px">${modeChip(r.mode)}</div>${md(r.text)}`;
    } catch (e) { item.querySelector(".qa-a").innerHTML = `<span class="flag-note">${esc(e.message)}</span>`; }
    $("#content").scrollIntoView({ block: "end", behavior: "smooth" });
  };
  $("#qa-send").addEventListener("click", () => { const v = $("#qa-input").value; $("#qa-input").value = ""; ask(v); });
  $("#qa-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { const v = e.target.value; e.target.value = ""; ask(v); } });
  $$(".suggest button").forEach((b) => b.addEventListener("click", () => ask(b.dataset.q)));
}

/* ---------------- AUDIT ---------------- */
function renderAudit(c) {
  const { state } = DATA;
  const d = [...state.decisions].reverse();
  c.innerHTML = `
    <div class="card">
      <div class="spread">
        <div><h2 class="section">Decision & approval trail</h2><p class="sub" style="margin:0">${state.decisions.length} recorded decision(s). This is the accountability record for every award.</p></div>
        <button class="btn btn-line btn-sm" id="export-btn2">⬇ Export decision memo</button>
      </div>
      ${d.length === 0 ? `<div class="empty">No decisions yet. Go to <b>Recommendation & Review</b> to record one.</div>` : `
      <div style="overflow-x:auto;margin-top:12px"><table>
        <thead><tr><th>When</th><th>Decision</th><th>Awarded to</th><th>Approver</th><th>Rationale</th><th>vs system</th></tr></thead>
        <tbody>
          ${d.map((x) => `<tr>
            <td class="muted">${new Date(x.timestamp).toLocaleString()}</td>
            <td>${actionPill(x.action)}</td>
            <td>${esc(x.vendorName || "—")}</td>
            <td>${esc(x.decidedBy)}</td>
            <td style="max-width:260px">${esc(x.reason || "—")}</td>
            <td>${x.wasOverride ? '<span class="pill warn">override</span>' : '<span class="pill info">matched</span>'}<div class="tag" style="margin-top:3px">rec: ${esc(x.systemRecommendedName || "—")}</div></td>
          </tr>`).join("")}
        </tbody>
      </table></div>`}
    </div>`;
  $("#export-btn2").addEventListener("click", exportMemo);
}
function actionPill(a) {
  if (a === "approve") return '<span class="pill good">✓ approve</span>';
  if (a === "override") return '<span class="pill warn">⇄ override</span>';
  return '<span class="pill bad">✗ reject</span>';
}

/* ---------------- sample ---------------- */
const SAMPLE_QUOTE = `From: sales@delta-office.example
Subject: Quote - Laptop supply

Hello,

Model: DeltaBook Pro 14 (i5, 16GB, 512GB)
Price per unit: INR 64,500 + GST
Quantity: 150
Shipping: INR 20,000
Delivery: 2 weeks
Warranty: 24 months onsite
Support: 12-hour response
Payment: Net 30
We are GST registered and ISO 27001 certified. MSME: No. Onsite support: Yes.

Regards,
Delta Office Systems`;

boot();
