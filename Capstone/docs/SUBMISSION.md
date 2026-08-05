# Capstone Submission — Gen AI for Business

## Submission form

| S. No. | Heading | Response |
|---|---|---|
| 1 | **Learner Name** (for certificate) | Uday Kiran Kondeti |
| 2 | **Roll Number** | _‹fill in your roll number›_ |
| 3 | **Name of the Project** (1–6) | **04 — Vendor Comparison and Procurement Assistant** |
| 4 | **Description of the project** (≤50 words) | ProcureWise is a working web app that turns messy vendor quotations (email, PDF, spreadsheet) into a standardised, transparently scored comparison. A deterministic engine ranks vendors and enforces compliance; generative AI parses quotes, explains the recommendation, drafts vendor emails and answers policy questions. A named human approves every award. |
| 5 | **Problem / Opportunity Statement** (≤50 words) | Buyers compare inconsistent quotes by hand, miss compliance requirements, and rarely record why a vendor was chosen. The opportunity is to standardise quotes automatically, score them reproducibly against weighted criteria and policy, and keep an auditable human-approved decision — cutting cycle time while improving transparency and governance. |
| 6 | **AI Tools / Applications used** | Anthropic **Claude** (Messages API) for quote parsing, recommendation narrative, email drafting and grounded policy Q&A; **Node.js** (standard library) backend; deterministic scoring engine; **Playwright** for automated UI testing. Runs with a deterministic fallback when no API key is present. |
| 7 | **Potential outcome / benefits** (≤50 words) | Faster sourcing (hours of manual comparison → minutes), quantified savings (4.9% under budget in the demo), enforced compliance (mandatory checks block non-conforming vendors), and 100% audit coverage with a named approver and rationale per award — all while keeping the purchase decision firmly with a human. |
| 8 | **Access link to the project** | GitHub: `https://github.com/udaykondeti/muj/tree/claude/full-project-7yb6fd/Capstone` |

---

## How this meets the "Common Expectations for Every Capstone"

- **One clear business problem** — vendor comparison for a single purchasing
  category (a 150-unit laptop fleet), not a scatter of features.
- **Manageable synthetic data** — three fictional quotes + a short policy.
- **One working journey input → output** — raw quote → standardised comparison →
  scored recommendation → human decision → decision memo.
- **Gen AI vs deterministic** — explicitly separated and labelled in the UI
  (see the table in the README).
- **Human review point** — a named human must approve/override/reject; the
  system cannot place an order.
- **Business metrics** — sourcing cycle time, realised savings %, compliance
  adherence, audit completeness.
- **Limitations & path to production** — documented in the README §8.

## Deliverables in this repository

- **Working application** — `Capstone/` (run with `node server/index.js`).
- **Deterministic scoring engine + tests** — `server/scoring.js`,
  `tests/scoring.test.js` (16 assertions, all passing).
- **Automated UI walkthrough** — `tests/e2e.mjs`.
- **Screenshots** — `docs/screenshots/` (9 screens of the full journey).
- **Project Overview** — `docs/Project_Overview.pdf` (title, summary, problem,
  solution, deliverables, screenshots).
- **Architecture notes** — `docs/ARCHITECTURE.md`.
- **Sample exported decision memo** — `docs/sample-decision-memo.md`.
