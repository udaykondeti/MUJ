/**
 * index.js — ProcureWise HTTP server (zero external dependencies).
 * Serves the static UI from /public and a small JSON API under /api.
 */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize } from "node:path";

import { config, aiEnabled } from "./config.js";
import * as store from "./store.js";
import { scoreVendors, computeMetrics } from "./scoring.js";
import { buildMemo } from "./memo.js";
import { parseQuote, explainRecommendation, clarificationEmail, policyQA } from "./ai.js";

const publicDir = fileURLToPath(new URL("../public", import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".png": "image/png",
};

/* ---------------- helpers ---------------- */
function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", ...extraHeaders });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error("Body too large"));
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}
function stateWithScoring() {
  const state = store.load();
  const scoring = scoreVendors(state);
  const metrics = computeMetrics(state);
  return { state, scoring, metrics };
}
function num(x, dflt = 0) {
  const n = typeof x === "number" ? x : parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : dflt;
}
function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "vendor";
}

/* ---------------- static files ---------------- */
async function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = normalize(join(publicDir, urlPath));
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error("dir");
    const body = await readFile(filePath);
    res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
  }
}

/* ---------------- API ---------------- */
async function handleApi(req, res, url) {
  const path = url.pathname;
  const method = req.method || "GET";

  // GET /api/health
  if (path === "/api/health" && method === "GET") {
    return sendJson(res, 200, {
      ok: true,
      ai: { enabled: aiEnabled, mode: aiEnabled ? "claude" : "fallback", model: config.anthropicModel },
    });
  }

  // GET /api/state
  if (path === "/api/state" && method === "GET") {
    return sendJson(res, 200, stateWithScoring());
  }

  // POST /api/reset
  if (path === "/api/reset" && method === "POST") {
    store.reset();
    return sendJson(res, 200, stateWithScoring());
  }

  // POST /api/parse-quote  { rawText }
  if (path === "/api/parse-quote" && method === "POST") {
    const { rawText } = await readBody(req);
    if (!rawText || !rawText.trim()) return sendJson(res, 400, { error: "rawText is required" });
    const result = await parseQuote(rawText);
    return sendJson(res, 200, result);
  }

  // POST /api/vendors  { vendor }   (create or update by id)
  if (path === "/api/vendors" && method === "POST") {
    const { vendor } = await readBody(req);
    if (!vendor || !vendor.name) return sendJson(res, 400, { error: "vendor.name is required" });
    const clean = {
      id: vendor.id || `${slug(vendor.name)}-${Date.now().toString(36)}`,
      name: String(vendor.name),
      product: String(vendor.product || ""),
      unitPrice: num(vendor.unitPrice),
      shipping: num(vendor.shipping),
      quantity: num(vendor.quantity, store.load().scenario.quantity),
      deliveryDays: num(vendor.deliveryDays),
      warrantyMonths: num(vendor.warrantyMonths),
      qualityRating: num(vendor.qualityRating, 4.0),
      supportSlaHours: num(vendor.supportSlaHours),
      paymentTermsDays: num(vendor.paymentTermsDays),
      compliance: {
        dataSecurityCert: Boolean(vendor.compliance?.dataSecurityCert),
        warrantyMin: vendor.compliance?.warrantyMin !== undefined
          ? Boolean(vendor.compliance.warrantyMin)
          : num(vendor.warrantyMonths) >= 12,
        gstRegistered: Boolean(vendor.compliance?.gstRegistered),
        onsiteSupportIN: Boolean(vendor.compliance?.onsiteSupportIN),
        msmeRegistered: Boolean(vendor.compliance?.msmeRegistered),
      },
      source: vendor.source || "manual",
      notes: String(vendor.notes || ""),
    };
    store.update((s) => {
      const i = s.vendors.findIndex((v) => v.id === clean.id);
      if (i >= 0) s.vendors[i] = clean;
      else s.vendors.push(clean);
    });
    return sendJson(res, 200, stateWithScoring());
  }

  // DELETE /api/vendors/:id
  const delMatch = path.match(/^\/api\/vendors\/([^/]+)$/);
  if (delMatch && method === "DELETE") {
    const id = decodeURIComponent(delMatch[1]);
    store.update((s) => {
      s.vendors = s.vendors.filter((v) => v.id !== id);
    });
    return sendJson(res, 200, stateWithScoring());
  }

  // PUT /api/criteria  { criteria: [{key, weight}] }
  if (path === "/api/criteria" && method === "PUT") {
    const { criteria } = await readBody(req);
    if (!Array.isArray(criteria)) return sendJson(res, 400, { error: "criteria array required" });
    store.update((s) => {
      for (const incoming of criteria) {
        const c = s.criteria.find((x) => x.key === incoming.key);
        if (c) c.weight = Math.max(0, num(incoming.weight));
      }
    });
    return sendJson(res, 200, stateWithScoring());
  }

  // PUT /api/scenario  { budgetPerUnit, quantity }
  if (path === "/api/scenario" && method === "PUT") {
    const body = await readBody(req);
    store.update((s) => {
      if (body.budgetPerUnit !== undefined) s.scenario.budgetPerUnit = num(body.budgetPerUnit);
      if (body.quantity !== undefined) {
        s.scenario.quantity = num(body.quantity);
        s.vendors.forEach((v) => (v.quantity = s.scenario.quantity));
      }
    });
    return sendJson(res, 200, stateWithScoring());
  }

  // POST /api/recommendation/explain
  if (path === "/api/recommendation/explain" && method === "POST") {
    const out = await explainRecommendation(store.load());
    return sendJson(res, 200, out);
  }

  // POST /api/clarification-email  { vendorId, questions? }
  if (path === "/api/clarification-email" && method === "POST") {
    const { vendorId, questions } = await readBody(req);
    const out = await clarificationEmail(store.load(), vendorId, questions);
    return sendJson(res, 200, out);
  }

  // POST /api/policy-qa  { question }
  if (path === "/api/policy-qa" && method === "POST") {
    const { question } = await readBody(req);
    if (!question || !question.trim()) return sendJson(res, 400, { error: "question is required" });
    const out = await policyQA(store.load(), question);
    return sendJson(res, 200, out);
  }

  // POST /api/decision  { vendorId, action, decidedBy, reason }
  if (path === "/api/decision" && method === "POST") {
    const { vendorId, action, decidedBy, reason } = await readBody(req);
    const valid = ["approve", "override", "reject"];
    if (!valid.includes(action)) return sendJson(res, 400, { error: "action must be approve|override|reject" });
    const state = store.load();
    const vendor = state.vendors.find((v) => v.id === vendorId);
    if (action !== "reject" && !vendor) return sendJson(res, 400, { error: "unknown vendorId" });
    const scoring = scoreVendors(state);
    const decision = {
      id: `d-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      action,
      vendorId: vendorId || null,
      vendorName: vendor ? vendor.name : null,
      decidedBy: (decidedBy && String(decidedBy).trim()) || "Unnamed approver",
      reason: String(reason || "").trim(),
      systemRecommendedId: scoring.recommendedId,
      systemRecommendedName: scoring.rows.find((r) => r.id === scoring.recommendedId)?.name || null,
      wasOverride: action === "override" || (action === "approve" && vendorId !== scoring.recommendedId),
      snapshotScore: scoring.rows.find((r) => r.id === vendorId)?.totalScore ?? null,
    };
    store.update((s) => s.decisions.push(decision));
    return sendJson(res, 200, { decision, ...stateWithScoring() });
  }

  // GET /api/export  -> markdown decision memo
  if (path === "/api/export" && method === "GET") {
    return sendJson(res, 200, { markdown: buildMemo(store.load()) });
  }

  return sendJson(res, 404, { error: "Unknown API route", path });
}

/* ---------------- boot ---------------- */
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://localhost:${config.port}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res);
    }
  } catch (err) {
    sendJson(res, 500, { error: err.message || "Server error" });
  }
});

server.listen(config.port, () => {
  store.load(); // seed on boot
  console.log(`\n  ProcureWise running →  http://localhost:${config.port}`);
  console.log(`  Gen AI mode: ${aiEnabled ? `Claude (${config.anthropicModel})` : "deterministic fallback (no API key set)"}\n`);
});
