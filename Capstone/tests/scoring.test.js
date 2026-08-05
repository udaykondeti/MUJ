/**
 * Minimal zero-dependency test runner for the deterministic scoring engine.
 * Run with: npm test   (or: node tests/scoring.test.js)
 */
import {
  computeTco,
  tcoPerUnit,
  scoreVendors,
  computeMetrics,
  complianceGaps,
  compliancePassPct,
} from "../server/scoring.js";
import { defaultState } from "../server/seed.js";

let passed = 0;
let failed = 0;

function assert(name, cond, extra = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${extra}`);
  }
}
function approx(a, b, eps = 0.5) {
  return Math.abs(a - b) <= eps;
}

console.log("Scoring engine tests\n");

const state = defaultState();

// --- TCO ---
const apex = state.vendors.find((v) => v.id === "apex");
assert("TCO = unitPrice*qty + shipping", computeTco(apex) === 62000 * 150 + 45000);
assert("TCO per unit is landed cost", tcoPerUnit(apex) === (62000 * 150 + 45000) / 150);

// --- Scoring determinism ---
const a = scoreVendors(state);
const b = scoreVendors(state);
assert("scoring is deterministic (same input -> same scores)",
  JSON.stringify(a.rows.map((r) => r.totalScore)) ===
    JSON.stringify(b.rows.map((r) => r.totalScore)));

// --- Scores bounded 0..100 ---
assert("all total scores within 0..100",
  a.rows.every((r) => r.totalScore >= 0 && r.totalScore <= 100));

// --- Normalization sanity: cheapest unit price gets 100 on that criterion ---
const cheapest = state.vendors.reduce((m, v) => (v.unitPrice < m.unitPrice ? v : m));
const cheapestRow = a.rows.find((r) => r.id === cheapest.id);
assert("cheapest vendor scores 100 on unitPrice (lower is better)",
  approx(cheapestRow.breakdown.unitPrice.normalized, 100));

// --- Weighted contribution sums to total score ---
for (const r of a.rows) {
  const sum = Object.values(r.breakdown).reduce((s, x) => s + x.weighted, 0);
  assert(`weighted breakdown sums to total for ${r.id}`, approx(sum, r.totalScore, 0.2),
    `(sum=${sum.toFixed(2)} total=${r.totalScore})`);
}

// --- Compliance gating: CoreVantage lacks ISO 27001 (mandatory) ---
const core = state.vendors.find((v) => v.id === "corevantage");
assert("CoreVantage has a mandatory compliance gap",
  complianceGaps(core, state.complianceChecklist).length > 0);
assert("recommendation is a compliant vendor",
  a.rows.find((r) => r.id === a.recommendedId).compliant === true);
assert("non-compliant vendor is not recommended even if cheap",
  a.recommendedId !== "corevantage");

// --- compliancePassPct in range ---
assert("compliance pass pct within 0..100",
  state.vendors.every((v) => {
    const p = compliancePassPct(v, state.complianceChecklist);
    return p >= 0 && p <= 100;
  }));

// --- Metrics ---
const m = computeMetrics(state);
assert("metrics returned for recommended vendor", m && m.vendorId === a.recommendedId);
assert("quotes compared == number of vendors", m.quotesCompared === state.vendors.length);
assert("savings vs budget computed", typeof m.savingsVsBudget === "number");

// --- Weight change moves the ranking (price-only weighting favors cheapest compliant) ---
const priceOnly = defaultState();
priceOnly.criteria = priceOnly.criteria.map((c) => ({
  ...c,
  weight: c.key === "unitPrice" ? 100 : 0,
}));
const po = scoreVendors(priceOnly);
assert("with price-only weighting, top compliant vendor is the cheapest compliant one",
  po.rows.find((r) => r.compliant).id !== undefined);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
