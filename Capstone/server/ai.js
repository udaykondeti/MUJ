/**
 * ai.js — Generative-AI features for ProcureWise.
 *
 * WHERE GEN AI ADDS VALUE (this file):
 *   • Reading messy, free-text vendor quotes into a clean structure
 *   • Explaining a recommendation in plain business language
 *   • Drafting clarification / negotiation emails
 *   • Answering policy questions grounded in the procurement policy
 *
 * WHERE IT DOES NOT (see scoring.js):
 *   • The numbers, ranking and compliance gating are deterministic.
 *
 * Every function works in two modes:
 *   • "claude"   — calls the Anthropic Messages API when ANTHROPIC_API_KEY is set.
 *   • "fallback" — deterministic logic so the whole app still runs (and demos
 *                  reliably) with no key, no network and no cost.
 * The mode is returned to the UI so reviewers always know what produced the text.
 */
import { config, aiEnabled } from "./config.js";
import { scoreVendors, computeMetrics } from "./scoring.js";

const CURRENCY = "INR";

/* ------------------------------------------------------------------ */
/* Anthropic API call                                                  */
/* ------------------------------------------------------------------ */
async function callClaude({ system, prompt, maxTokens = 1200 }) {
  const res = await fetch(`${config.anthropicBase}/v1/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": config.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.anthropicModel,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  return (data.content || []).map((b) => b.text || "").join("").trim();
}

function extractJson(text) {
  // Pull the first balanced {...} block out of an LLM reply.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON found in model reply");
  return JSON.parse(text.slice(start, end + 1));
}

/* ------------------------------------------------------------------ */
/* 1) Parse a raw quotation into structured fields                     */
/* ------------------------------------------------------------------ */
export async function parseQuote(rawText) {
  if (aiEnabled) {
    try {
      const system =
        "You extract structured procurement data from a raw vendor quotation. " +
        "Return ONLY a JSON object, no prose.";
      const prompt = `From the quotation below, extract these fields as JSON:
{
  "name": string (vendor company name),
  "product": string,
  "unitPrice": number (INR, per unit, exclude GST if separable),
  "shipping": number (INR, total freight/handling; 0 if free/included),
  "quantity": number,
  "deliveryDays": number (convert weeks to days),
  "warrantyMonths": number (convert years to months),
  "supportSlaHours": number (response SLA in hours),
  "paymentTermsDays": number (e.g. "Net 30" -> 30),
  "qualityRating": number (1-5; estimate 4.0 if unstated),
  "compliance": {
    "dataSecurityCert": boolean (ISO 27001),
    "warrantyMin": boolean (warranty >= 12 months),
    "gstRegistered": boolean,
    "onsiteSupportIN": boolean (on-site support in India; false if partial/none),
    "msmeRegistered": boolean
  }
}

QUOTATION:
"""${rawText}"""`;
      const reply = await callClaude({ system, prompt, maxTokens: 700 });
      const parsed = extractJson(reply);
      return { mode: "claude", vendor: normalizeParsed(parsed) };
    } catch (err) {
      // Fall through to deterministic parsing on any failure.
      return { mode: "fallback", vendor: heuristicParse(rawText), warning: String(err.message) };
    }
  }
  return { mode: "fallback", vendor: heuristicParse(rawText) };
}

function normalizeParsed(p) {
  const n = (x) => {
    const v = typeof x === "number" ? x : parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(v) ? v : 0;
  };
  return {
    name: p.name || "Unnamed vendor",
    product: p.product || "",
    unitPrice: n(p.unitPrice),
    shipping: n(p.shipping),
    quantity: n(p.quantity) || 150,
    deliveryDays: n(p.deliveryDays),
    warrantyMonths: n(p.warrantyMonths),
    supportSlaHours: n(p.supportSlaHours),
    paymentTermsDays: n(p.paymentTermsDays),
    qualityRating: n(p.qualityRating) || 4.0,
    compliance: {
      dataSecurityCert: Boolean(p.compliance?.dataSecurityCert),
      warrantyMin: p.compliance?.warrantyMin !== undefined
        ? Boolean(p.compliance.warrantyMin)
        : n(p.warrantyMonths) >= 12,
      gstRegistered: Boolean(p.compliance?.gstRegistered),
      onsiteSupportIN: Boolean(p.compliance?.onsiteSupportIN),
      msmeRegistered: Boolean(p.compliance?.msmeRegistered),
    },
  };
}

/** Deterministic regex-based parser (used without an API key). */
function heuristicParse(text) {
  // Collapse ONLY the commas that sit between digits ("62,000" -> "62000"),
  // so CSV delimiters like "qty,150" are preserved.
  const t = text.replace(/(\d),(?=\d)/g, "$1");
  const lower = text.toLowerCase();

  const grab = (re) => {
    const m = t.match(re);
    return m ? parseFloat(m[1]) : null;
  };

  // Unit price: "INR 62000", "Rs. 68500", "unit_price_inr,59900", "Price per unit ... 68500"
  let unitPrice =
    grab(/(?:unit[_ ]?price|price per unit|price per|per unit|unit_price_inr)[^0-9\n]{0,25}(\d{4,7})/i) ??
    grab(/(?:inr|rs\.?)\s*(\d{4,7})/i) ??
    0;

  // Shipping / freight (allow words/dots before the number, same line only)
  let shipping = grab(/(?:freight|shipping|handling)[^0-9\n]{0,30}(\d{3,7})/i) ?? 0;
  const shipLine = lower.match(/(?:freight|shipping|handling)[^\n]*/)?.[0] || "";
  if (/free|included|inclusive/i.test(shipLine)) shipping = 0;

  // Delivery: days or weeks (dotted lines can be long, so allow a wide gap)
  let deliveryDays =
    grab(/(?:delivery_days|lead[_ ]?time|delivery)[^0-9\n]{0,40}(\d+)\s*day/i) ??
    grab(/delivery_days,(\d+)/i);
  if (deliveryDays == null) {
    const weeks = grab(/(\d+)\s*week/i);
    if (weeks != null) deliveryDays = weeks * 7;
  }
  if (deliveryDays == null) deliveryDays = 21;

  // Warranty: months or years
  let warrantyMonths =
    grab(/warranty[^0-9\n]{0,40}(\d+)\s*month/i) ??
    grab(/warranty_months,(\d+)/i) ??
    grab(/(\d+)\s*month[^\n]*warranty/i);
  if (warrantyMonths == null) {
    const yrs = grab(/warranty[^0-9\n]{0,40}(\d+)\s*year/i) ?? grab(/(\d+)\s*year/i);
    if (yrs != null) warrantyMonths = yrs * 12;
  }
  if (warrantyMonths == null) warrantyMonths = 12;

  // SLA hours
  let supportSlaHours =
    grab(/(\d+)\s*[- ]?hour/i) ??
    grab(/support_sla_hours,(\d+)/i) ??
    24; // "next business day" and unstated both default to ~24h

  // Payment terms
  let paymentTermsDays = grab(/net\s*(\d+)/i) ?? grab(/payment_terms_days,(\d+)/i) ?? 30;

  // Quantity (word-boundaries stop "units" from matching "unit_price")
  let quantity = grab(/\b(?:qty|quantity|units)\b[^0-9\n]{0,12}(\d{1,6})/i) ?? 150;

  // First explicit yes/no on the SAME line as a keyword (handles both
  // "MSME registered ...... Yes" and "MSME: No. Onsite: Yes" correctly).
  const firstYesNo = (kw) => {
    const idx = lower.search(kw);
    if (idx < 0) return null;
    const eol = lower.indexOf("\n", idx);
    const line = lower.slice(idx, eol < 0 ? undefined : eol);
    const m = line.match(/\b(yes|no)\b/);
    return m ? m[1] === "yes" : null;
  };
  const compliance = {
    dataSecurityCert: /iso\s*27001/i.test(text) && !/iso27001,\s*no/i.test(lower),
    warrantyMin: warrantyMonths >= 12,
    // GST present, unless explicitly negated close to the word "gst"
    gstRegistered: /gst/i.test(text) && !/(gst[^\n]{0,12}\b(no|not|unregistered)\b|\bno\s+gst)/i.test(lower),
    onsiteSupportIN:
      firstYesNo(/onsite|on-site/) === true ||
      /pan-india/i.test(lower) ||
      /onsite_support_india,\s*yes/i.test(lower),
    msmeRegistered: firstYesNo(/msme/) === true,
  };
  // explicit "no" handling for csv-style
  if (/iso27001,\s*no/i.test(lower)) compliance.dataSecurityCert = false;
  if (/onsite_support_india,\s*(partial|no)/i.test(lower)) compliance.onsiteSupportIN = false;

  // Name / product best-effort
  const nameMatch =
    text.match(/^([A-Z][A-Za-z0-9&.\- ]+?(?:Solutions|Technologies|Systems|Ltd|Inc|Pvt|Corp))/m) ||
    text.match(/vendor,([^\n]+)/i) ||
    text.match(/^([A-Z][A-Za-z0-9&.\- ]{3,40})/m);
  const productMatch =
    text.match(/(?:model|description|product)[^A-Za-z0-9\n]{0,40}([A-Za-z0-9][^\n]{3,60})/i);

  return {
    name: (nameMatch ? nameMatch[1] : "Unnamed vendor").trim(),
    product: (productMatch ? productMatch[1] : "").trim(),
    unitPrice,
    shipping,
    quantity,
    deliveryDays,
    warrantyMonths,
    supportSlaHours,
    paymentTermsDays,
    qualityRating: 4.0,
    compliance,
  };
}

/* ------------------------------------------------------------------ */
/* 2) Explain the recommendation                                       */
/* ------------------------------------------------------------------ */
export async function explainRecommendation(state) {
  const result = scoreVendors(state);
  const metrics = computeMetrics(state);
  const rec = result.rows.find((r) => r.id === result.recommendedId);

  if (aiEnabled && rec) {
    try {
      const system =
        "You are a procurement analyst assistant. Explain a vendor recommendation " +
        "clearly and neutrally for a category manager. Use the supplied numbers only; " +
        "do not invent facts. Note that a human must approve — you never place orders. " +
        "Use short markdown with a heading, 3-5 bullet points, and a one-line caveat.";
      const prompt = `Scenario: ${state.scenario.company} is buying ${state.scenario.quantity} units for "${state.scenario.category}".
Recommended vendor: ${rec.name} (${rec.product}). Total score ${rec.totalScore}/100, rank ${rec.rank}.
Fleet TCO ${fmt(rec.tco)}, per-unit landed ${fmt(rec.tcoPerUnit)}.
Estimated saving vs budget: ${fmt(metrics.savingsVsBudget)} (${metrics.savingsVsBudgetPct}%).
Full comparison (score / TCO / compliant):
${result.rows.map((r) => `- ${r.name}: score ${r.totalScore}, TCO ${fmt(r.tco)}, compliant=${r.compliant}${r.complianceGaps.length ? " gaps:[" + r.complianceGaps.join("; ") + "]" : ""}`).join("\n")}
Criteria weights: ${result.weightsUsed.map((w) => `${w.label} ${w.weight}%`).join(", ")}.`;
      const text = await callClaude({ system, prompt, maxTokens: 900 });
      return { mode: "claude", text, recommendedId: rec.id };
    } catch (err) {
      return { mode: "fallback", text: fallbackExplanation(state, result, metrics, rec), recommendedId: rec?.id, warning: String(err.message) };
    }
  }
  return { mode: "fallback", text: fallbackExplanation(state, result, metrics, rec), recommendedId: rec?.id };
}

function fallbackExplanation(state, result, metrics, rec) {
  if (!rec) return "No vendor could be recommended.";
  const others = result.rows.filter((r) => r.id !== rec.id);
  const topCriteria = Object.entries(rec.breakdown)
    .sort((a, b) => b[1].weighted - a[1].weighted)
    .slice(0, 3)
    .map(([k, v]) => `${labelFor(state, k)} (${v.normalized}/100)`);
  const blocked = result.rows.filter((r) => !r.compliant);

  return `### Recommendation: ${rec.name}

**${rec.name}** ranks #1 with a weighted score of **${rec.totalScore}/100** for the ${state.scenario.quantity}-unit ${state.scenario.category.toLowerCase()}.

- **Strongest on:** ${topCriteria.join(", ")}.
- **Fleet cost (TCO):** ${fmt(rec.tco)} — about ${fmt(rec.tcoPerUnit)} per unit including freight.
- **Estimated saving vs the ${fmt(state.scenario.budgetPerUnit)}/unit budget:** ${fmt(metrics.savingsVsBudget)} (${metrics.savingsVsBudgetPct}%).
- **Compliance:** passes all mandatory checks (${rec.compliancePassPct}% of the full checklist).
${blocked.length ? `- **Excluded from award:** ${blocked.map((b) => `${b.name} — ${b.complianceGaps.join(", ")}`).join("; ")}.` : ""}

Compared with ${others.map((o) => `${o.name} (${o.totalScore})`).join(" and ")}, ${rec.name} offers the best balance of the weighted criteria while meeting every mandatory policy requirement.

_This is a decision-support summary generated from the scoring table. ProcureWise does not place orders — a named human approver must sign off before any commitment._`;
}

/* ------------------------------------------------------------------ */
/* 3) Clarification / negotiation email                                */
/* ------------------------------------------------------------------ */
export async function clarificationEmail(state, vendorId, questions) {
  const vendor = state.vendors.find((v) => v.id === vendorId);
  if (!vendor) return { mode: "fallback", text: "Vendor not found." };
  const qList = (questions && questions.length ? questions : defaultQuestions(state, vendor));

  if (aiEnabled) {
    try {
      const system =
        "You draft short, polite, professional B2B procurement emails on behalf of a buyer. " +
        "Keep it under 180 words. Do not commit to any purchase or price. Sign as the buyer.";
      const prompt = `Write a clarification email to ${vendor.name} regarding their quotation for ${state.scenario.quantity} ${state.scenario.category} units for ${state.scenario.company}.
Ask these points:\n${qList.map((q, i) => `${i + 1}. ${q}`).join("\n")}\nBuyer: ${state.scenario.buyer}, ${state.scenario.company}.`;
      const text = await callClaude({ system, prompt, maxTokens: 500 });
      return { mode: "claude", text, vendorId, questions: qList };
    } catch (err) {
      return { mode: "fallback", text: fallbackEmail(state, vendor, qList), vendorId, questions: qList, warning: String(err.message) };
    }
  }
  return { mode: "fallback", text: fallbackEmail(state, vendor, qList), vendorId, questions: qList };
}

function defaultQuestions(state, vendor) {
  const qs = [];
  if (!vendor.compliance.dataSecurityCert)
    qs.push("Can you provide a valid ISO 27001 certificate, as our policy requires it for data-bearing devices?");
  if (vendor.paymentTermsDays < 30)
    qs.push(`Would you be able to extend payment terms from Net ${vendor.paymentTermsDays} to at least Net 30?`);
  if (vendor.shipping > 0)
    qs.push(`Is there scope to waive or reduce the freight charge of ${fmt(vendor.shipping)} on an order of this size?`);
  qs.push("Please confirm the unit price is firm for 60 days and whether volume discounts apply above 150 units.");
  return qs;
}

function fallbackEmail(state, vendor, qs) {
  return `Subject: Clarifications on your quotation — ${state.scenario.category} (${state.scenario.quantity} units)

Dear ${vendor.name} team,

Thank you for your quotation for the ${state.scenario.category.toLowerCase()} requirement at ${state.scenario.company}. Before we finalise our evaluation, we would appreciate clarification on the following:

${qs.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Kindly send your response at your earliest convenience. Please note this message is a request for information only and does not constitute an order or a commitment to purchase.

Best regards,
${state.scenario.buyer}
${state.scenario.company}

— Draft prepared with ProcureWise for buyer review before sending.`;
}

/* ------------------------------------------------------------------ */
/* 4) Procurement-policy Q&A (grounded)                                */
/* ------------------------------------------------------------------ */
export async function policyQA(state, question) {
  const policy = state.procurementPolicy || "";
  if (aiEnabled) {
    try {
      const system =
        "You answer procurement-policy questions using ONLY the provided policy text. " +
        "If the policy does not cover it, say so. Cite the clause number(s) you rely on. Be concise.";
      const prompt = `POLICY:\n"""${policy}"""\n\nQUESTION: ${question}`;
      const text = await callClaude({ system, prompt, maxTokens: 500 });
      return { mode: "claude", text };
    } catch (err) {
      return { mode: "fallback", text: fallbackPolicyQA(policy, question), warning: String(err.message) };
    }
  }
  return { mode: "fallback", text: fallbackPolicyQA(policy, question) };
}

/** Keyword retrieval over policy clauses (no API key needed). */
function fallbackPolicyQA(policy, question) {
  const clauses = policy
    .split("\n")
    .filter((l) => /^\d/.test(l.trim()))
    .map((l) => l.trim());
  const stop = new Set(["the", "a", "an", "of", "to", "is", "are", "for", "do", "we", "our", "and", "or", "what", "how", "much", "can", "does", "need", "require", "requires", "if", "on", "in", "be", "must"]);
  const terms = question.toLowerCase().match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !stop.has(w)) || [];
  const scored = clauses
    .map((c) => {
      const cl = c.toLowerCase();
      const score = terms.reduce((s, t) => s + (cl.includes(t) ? 1 : 0), 0);
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!scored.length) {
    return "I couldn't find a clause in the procurement policy that covers that question. Please rephrase, or refer the query to the Finance team.";
  }
  return `Based on the procurement policy:\n\n${scored.map((s) => `- ${s.c}`).join("\n")}\n\n_(Answer retrieved from the policy document. Verify with the policy owner for edge cases.)_`;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
function labelFor(state, key) {
  return state.criteria.find((c) => c.key === key)?.label || key;
}
function fmt(n) {
  // Indian-style grouping, e.g. 93,45,000
  const s = Math.round(n).toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return `${CURRENCY} ${grouped}`;
}
