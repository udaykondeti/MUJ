# ProcureWise — Architecture

## Overview

ProcureWise is a small, self-contained web application. The backend is a
**zero-dependency Node.js HTTP server**; the frontend is a **vanilla
single-page app** (no build step). Generative AI is an optional enhancement with
a deterministic fallback, so the whole system runs offline for a reliable demo.

```
Browser (public/) ──HTTP/JSON──> Node server (server/index.js)
                                     │
        ┌────────────────────────────┼───────────────────────────┐
        ▼                            ▼                             ▼
  scoring.js                      ai.js                        store.js
  (deterministic)          (Claude | fallback)            (data/state.json)
```

## Data flow: one sourcing journey

1. **Ingest** — `POST /api/parse-quote` sends raw quote text to `ai.js`.
   - With `ANTHROPIC_API_KEY`: Claude returns structured JSON.
   - Without: a regex/heuristic parser extracts the same fields.
2. **Persist** — `POST /api/vendors` validates and stores the vendor in
   `store.js` (`data/state.json`).
3. **Score** — every read (`GET /api/state`) runs `scoring.js`:
   - min–max normalise each criterion to 0–100 (respecting lower/higher-is-better),
   - multiply by the criterion's weight fraction,
   - sum to a total score,
   - compute TCO = `unitPrice × quantity + shipping`,
   - flag mandatory compliance gaps and **exclude** those vendors from the award,
   - rank, and select the top **compliant** vendor.
4. **Explain** — `POST /api/recommendation/explain` → AI narrative built from the
   (already computed) numbers.
5. **Decide** — `POST /api/decision` records a human approve/override/reject with
   approver + rationale into an append-only `decisions[]` audit log.
6. **Communicate** — `POST /api/clarification-email`, `POST /api/policy-qa`.
7. **Export** — `GET /api/export` renders a Markdown decision memo.

## API surface

| Method & path | Purpose | AI? |
|---|---|---|
| `GET /api/health` | AI mode + model | — |
| `GET /api/state` | full state + scoring + metrics | deterministic |
| `POST /api/parse-quote` | raw text → structured vendor | **AI / fallback** |
| `POST /api/vendors` | create/update vendor | — |
| `DELETE /api/vendors/:id` | remove vendor | — |
| `PUT /api/criteria` | update weights | — |
| `PUT /api/scenario` | update budget/quantity | — |
| `POST /api/recommendation/explain` | rationale text | **AI / fallback** |
| `POST /api/clarification-email` | vendor email draft | **AI / fallback** |
| `POST /api/policy-qa` | grounded policy answer | **AI / fallback** |
| `POST /api/decision` | record human decision | — |
| `GET /api/export` | Markdown decision memo | deterministic |
| `POST /api/reset` | restore demo scenario | — |

## Determinism guarantee

`scoring.js` contains no randomness and no AI. Given the same vendors, criteria
and weights it always returns identical scores — verified by
`tests/scoring.test.js`. This is what makes the recommendation auditable: a
reviewer can reproduce every number by hand from the comparison matrix, where
each cell shows `raw value → normalised → weighted`.

## AI safety posture

- AI **drafts and explains**; it never computes the numbers or places an order.
- Policy Q&A is **grounded** — the model is instructed to answer only from the
  supplied policy text and cite clauses.
- Every AI output is **labelled** in the UI with its mode.
- The parsed quote and the recommendation both require **human review** before
  they take effect (add-to-comparison / record-decision).
