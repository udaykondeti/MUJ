/**
 * seed.js — Default business scenario for ProcureWise.
 *
 * Scenario (fictional): NorthBridge Retail Group is refreshing the laptops used
 * by its 150 field / store-audit staff. The procurement analyst has collected
 * three vendor quotations that arrived in three different formats (an email, a
 * quote PDF pasted as text, and a spreadsheet dump). ProcureWise standardises
 * them, scores them against transparent criteria, and produces a *reviewable*
 * recommendation — it never places the order itself.
 *
 * All data here is synthetic. Currency is Indian Rupees (INR).
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const CURRENCY = "INR";

/** Scenario / engagement metadata. */
export const scenario = {
  company: "NorthBridge Retail Group",
  buyer: "Procurement Analyst — IT Category",
  category: "Field-Team Laptop Fleet",
  requirementSummary:
    "Refresh 150 laptops for field and store-audit staff. Machines carry customer " +
    "and sales data, so information-security compliance is mandatory. Target rollout " +
    "within 4 weeks.",
  quantity: 150,
  currency: CURRENCY,
  budgetPerUnit: 72000, // last-cycle / budgeted unit price — baseline for savings metric
};

/**
 * Scoring criteria chosen by the procurement team.
 * direction: "lower" = smaller is better, "higher" = larger is better.
 * weight: relative importance (the engine normalises weights, but these sum to 100).
 */
export const defaultCriteria = [
  { key: "unitPrice",       label: "Unit price",         unit: "INR",   direction: "lower",  weight: 30 },
  { key: "qualityRating",   label: "Quality rating",     unit: "/5",    direction: "higher", weight: 20 },
  { key: "deliveryDays",    label: "Delivery time",      unit: "days",  direction: "lower",  weight: 15 },
  { key: "warrantyMonths",  label: "Warranty",           unit: "months",direction: "higher", weight: 15 },
  { key: "supportSlaHours", label: "Support response SLA",unit: "hours", direction: "lower",  weight: 10 },
  { key: "paymentTermsDays",label: "Payment terms",      unit: "days",  direction: "higher", weight: 10 },
];

/**
 * Compliance checklist. Each vendor is marked pass/fail against these,
 * derived from the procurement policy below. Failing a "mandatory" item
 * disqualifies a vendor from an unconditional award.
 */
export const complianceChecklist = [
  { key: "dataSecurityCert", label: "ISO 27001 information-security certified", mandatory: true },
  { key: "warrantyMin",      label: "Warranty ≥ 12 months",                     mandatory: true },
  { key: "gstRegistered",    label: "GST registered / valid tax profile",       mandatory: true },
  { key: "onsiteSupportIN",  label: "On-site support presence in India",        mandatory: false },
  { key: "msmeRegistered",   label: "MSME registered (preference)",             mandatory: false },
];

/** The three raw quotations, exactly as they might have arrived (unstructured). */
export const rawQuotes = {
  apex: `From: sales@apexcomputing.example
Subject: Quotation - NorthBridge Laptop Refresh (150 units)

Hi,

Thanks for the RFQ. Please find our best pricing below.

Model: Apex ProBook 14 (i5, 16GB, 512GB SSD)
Unit price: INR 62,000 (exclusive of GST)
Quantity: 150
Freight & handling: INR 45,000 total
Delivery: 3 weeks from PO
Warranty: 2 years onsite
Support: next-business-day response (approx 24 hours)
Payment terms: Net 30 days
We are GST registered and ISO 27001 certified.
MSME: No

Regards,
Apex Computing Solutions`,

  bluebyte: `BLUEBYTE TECHNOLOGIES — FORMAL QUOTATION
Ref: BQ-4471 | Item: Corporate laptop supply

Description ................ BlueByte Edge 14 (i5, 16GB, 512GB)
Price per unit ............. Rs. 68,500 + GST
Units ...................... 150
Shipping ................... FREE (included)
Lead time .................. 14 days
Warranty ................... 36 months, onsite
SLA ........................ 8-hour response, 24x7 desk
Terms ...................... Net 45
Certifications ............. ISO 27001, ISO 9001, GST registered
Onsite support ............. Yes (pan-India)
MSME registered ............ Yes`,

  corevantage: `CoreVantage Systems - quote export
field,value
vendor,CoreVantage Systems
product,Vantage Book 14 (i5/16/512)
unit_price_inr,59900
qty,150
shipping_inr,60000
delivery_days,30
warranty_months,12
support_sla_hours,48
payment_terms_days,15
gst_registered,yes
iso27001,no
onsite_support_india,partial
msme,yes`,
};

/**
 * Pre-parsed structured vendors so the app has a working comparison on first
 * load. In the live demo these are produced by the "Parse quote with AI" action
 * from the raw text above.
 */
export const defaultVendors = [
  {
    id: "apex",
    name: "Apex Computing Solutions",
    product: "Apex ProBook 14 (i5 / 16GB / 512GB SSD)",
    unitPrice: 62000,
    shipping: 45000,
    quantity: 150,
    deliveryDays: 21,
    warrantyMonths: 24,
    qualityRating: 4.2,
    supportSlaHours: 24,
    paymentTermsDays: 30,
    compliance: {
      dataSecurityCert: true,
      warrantyMin: true,
      gstRegistered: true,
      onsiteSupportIN: true,
      msmeRegistered: false,
    },
    source: "email",
    notes: "",
  },
  {
    id: "bluebyte",
    name: "BlueByte Technologies",
    product: "BlueByte Edge 14 (i5 / 16GB / 512GB)",
    unitPrice: 68500,
    shipping: 0,
    quantity: 150,
    deliveryDays: 14,
    warrantyMonths: 36,
    qualityRating: 4.6,
    supportSlaHours: 8,
    paymentTermsDays: 45,
    compliance: {
      dataSecurityCert: true,
      warrantyMin: true,
      gstRegistered: true,
      onsiteSupportIN: true,
      msmeRegistered: true,
    },
    source: "pdf",
    notes: "",
  },
  {
    id: "corevantage",
    name: "CoreVantage Systems",
    product: "Vantage Book 14 (i5 / 16GB / 512GB)",
    unitPrice: 59900,
    shipping: 60000,
    quantity: 150,
    deliveryDays: 30,
    warrantyMonths: 12,
    qualityRating: 3.8,
    supportSlaHours: 48,
    paymentTermsDays: 15,
    compliance: {
      dataSecurityCert: false, // no ISO 27001 -> mandatory compliance gap
      warrantyMin: true,
      gstRegistered: true,
      onsiteSupportIN: false, // only "partial"
      msmeRegistered: true,
    },
    source: "spreadsheet",
    notes: "",
  },
];

/** Procurement policy — the knowledge base for compliance flags and policy Q&A. */
export const procurementPolicy = `NORTHBRIDGE RETAIL GROUP — PROCUREMENT POLICY (EXTRACT)

1. QUOTATIONS
1.1 Any purchase above INR 5,00,000 requires at least three written quotations.
1.2 Single-source awards above INR 25,00,000 require a documented justification
    approved by the Finance Director.

2. APPROVAL AUTHORITY
2.1 Purchases up to INR 25,00,000: Category Manager may approve.
2.2 Purchases above INR 25,00,000 and up to INR 1,00,00,000: Finance Director approval.
2.3 Purchases above INR 1,00,00,000: CFO and CEO joint approval.
2.4 No automated system may issue a purchase order or make a financial commitment.
    Every award requires a named human approver.

3. INFORMATION SECURITY
3.1 Any vendor whose products or services store or process customer or employee data
    must hold a valid ISO 27001 certificate.
3.2 Vendors without ISO 27001 may only be used for non-data-bearing goods.

4. WARRANTY & SUPPORT
4.1 IT hardware must carry a minimum warranty of 12 months.
4.2 On-site support presence in India is preferred for fleet deployments above 100 units.

5. PAYMENT TERMS
5.1 Standard payment terms are Net 30. Terms shorter than Net 15 require Finance approval.
5.2 Longer terms (Net 45 / Net 60) are preferred where price is comparable.

6. SUPPLIER PREFERENCE
6.1 Where quality and price are comparable, MSME-registered suppliers are preferred
    in line with the group's supplier-diversity commitment.

7. TAX
7.1 All vendors must be GST registered and provide a valid GSTIN before award.`;

/** Build a fresh default application state. */
export function defaultState() {
  return {
    version: 1,
    scenario,
    criteria: defaultCriteria.map((c) => ({ ...c })),
    complianceChecklist: complianceChecklist.map((c) => ({ ...c })),
    vendors: defaultVendors.map((v) => ({ ...v, compliance: { ...v.compliance } })),
    rawQuotes,
    procurementPolicy,
    decisions: [], // audit trail of human approvals / overrides
    createdAt: "seed",
  };
}

// `node server/seed.js --write` prints the default state JSON (handy for docs).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const state = defaultState();
  if (process.argv.includes("--write")) {
    const out = fileURLToPath(new URL("../data/seed/default-state.json", import.meta.url));
    writeFileSync(out, JSON.stringify(state, null, 2));
    console.log("Wrote", out);
  } else {
    console.log(JSON.stringify(state, null, 2));
  }
}
