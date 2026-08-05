/**
 * scoring.js — Deterministic, reproducible vendor scoring.
 *
 * This module contains NO AI. Given the vendors, criteria and weights it always
 * produces the same numbers, so a procurement reviewer can audit exactly why a
 * vendor ranked where it did. Generative AI is used elsewhere only to *explain*
 * and *communicate* these numbers — never to compute them.
 */

/** Total Cost of Ownership for the fleet: unit price × quantity + shipping. */
export function computeTco(vendor) {
  const qty = num(vendor.quantity);
  return num(vendor.unitPrice) * qty + num(vendor.shipping);
}

/** Per-unit landed cost (TCO spread across the fleet). */
export function tcoPerUnit(vendor) {
  const qty = num(vendor.quantity) || 1;
  return computeTco(vendor) / qty;
}

/**
 * Min–max normalise a raw value to 0–100 given the min/max seen across vendors
 * and the criterion direction. Higher normalized == better, always.
 */
function normalize(value, min, max, direction) {
  if (max === min) return 100; // everyone equal on this criterion
  const t = (value - min) / (max - min); // 0..1 where 1 == the max value
  return direction === "lower" ? (1 - t) * 100 : t * 100;
}

/** Which compliance items (mandatory) does a vendor fail? Returns labels. */
export function complianceGaps(vendor, checklist) {
  const gaps = [];
  for (const item of checklist) {
    const passed = Boolean(vendor.compliance?.[item.key]);
    if (item.mandatory && !passed) gaps.push(item.label);
  }
  return gaps;
}

export function compliancePassPct(vendor, checklist) {
  if (!checklist.length) return 100;
  const passed = checklist.filter((i) => Boolean(vendor.compliance?.[i.key])).length;
  return Math.round((passed / checklist.length) * 100);
}

/**
 * Score every vendor. Returns a fully explained result object:
 *   { rows: [...], recommendedId, weightsUsed, baselineUnit }
 * Each row includes the per-criterion normalized + weighted contribution so the
 * UI and the AI narrative can show a transparent breakdown.
 */
export function scoreVendors(state) {
  const { vendors, criteria, complianceChecklist = [], scenario = {} } = state;
  const totalWeight = criteria.reduce((s, c) => s + num(c.weight), 0) || 1;

  // Pre-compute min/max per criterion across all vendors.
  const bounds = {};
  for (const c of criteria) {
    const values = vendors.map((v) => num(v[c.key]));
    bounds[c.key] = { min: Math.min(...values), max: Math.max(...values) };
  }

  const rows = vendors.map((v) => {
    const breakdown = {};
    let total = 0;
    for (const c of criteria) {
      const value = num(v[c.key]);
      const { min, max } = bounds[c.key];
      const normalized = normalize(value, min, max, c.direction);
      const weightFraction = num(c.weight) / totalWeight;
      const weighted = normalized * weightFraction;
      total += weighted;
      breakdown[c.key] = {
        value,
        unit: c.unit,
        direction: c.direction,
        normalized: round(normalized, 1),
        weightPct: round(weightFraction * 100, 1),
        weighted: round(weighted, 2),
      };
    }

    const gaps = complianceGaps(v, complianceChecklist);
    return {
      id: v.id,
      name: v.name,
      product: v.product,
      tco: computeTco(v),
      tcoPerUnit: round(tcoPerUnit(v), 0),
      unitPrice: num(v.unitPrice),
      totalScore: round(total, 1),
      breakdown,
      compliancePassPct: compliancePassPct(v, complianceChecklist),
      complianceGaps: gaps,
      compliant: gaps.length === 0,
    };
  });

  // Rank by score (descending). Ties broken by lower TCO.
  const ranked = [...rows].sort(
    (a, b) => b.totalScore - a.totalScore || a.tco - b.tco,
  );
  ranked.forEach((r, i) => (r.rank = i + 1));

  // Recommend the highest-scoring *compliant* vendor. If none is compliant,
  // fall back to the top overall but flag that it cannot be awarded as-is.
  const compliantRanked = ranked.filter((r) => r.compliant);
  const recommended = compliantRanked[0] || ranked[0];
  const recommendedId = recommended ? recommended.id : null;
  const recommendationBlocked = !recommended?.compliant;

  return {
    rows: ranked,
    recommendedId,
    recommendationBlocked,
    weightsUsed: criteria.map((c) => ({ key: c.key, label: c.label, weight: num(c.weight) })),
    baselineUnit: num(scenario.budgetPerUnit),
  };
}

/**
 * Business metrics for the currently recommended (or selected) vendor, relative
 * to the budgeted baseline and to the most expensive quote.
 */
export function computeMetrics(state, selectedId) {
  const result = scoreVendors(state);
  const id = selectedId || result.recommendedId;
  const row = result.rows.find((r) => r.id === id);
  if (!row) return null;

  const qty = num(state.scenario?.quantity) || 1;
  const baselineUnit = num(state.scenario?.budgetPerUnit);
  const baselineTotal = baselineUnit * qty;

  const worst = result.rows.reduce((m, r) => (r.tco > m.tco ? r : m), result.rows[0]);

  const savingsVsBudget = baselineTotal - row.tco;
  const savingsVsWorst = worst.tco - row.tco;

  return {
    vendorId: row.id,
    vendorName: row.name,
    tco: row.tco,
    tcoPerUnit: row.tcoPerUnit,
    baselineTotal,
    savingsVsBudget,
    savingsVsBudgetPct: baselineTotal ? round((savingsVsBudget / baselineTotal) * 100, 1) : 0,
    savingsVsWorst,
    savingsVsWorstPct: worst.tco ? round((savingsVsWorst / worst.tco) * 100, 1) : 0,
    compliancePassPct: row.compliancePassPct,
    score: row.totalScore,
    quotesCompared: result.rows.length,
  };
}

// --- helpers ---
function num(x) {
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function round(x, dp = 0) {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}
