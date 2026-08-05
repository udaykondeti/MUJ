import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { setTimeout as sleep } from "node:timers/promises";
import { writeFileSync, mkdirSync } from "node:fs";

const PORT = process.env.PORT || "3963";
const BASE = `http://localhost:${PORT}`;
const OUT = fileURLToPath(new URL("../docs/screenshots", import.meta.url));
mkdirSync(OUT, { recursive: true });
const errors = [];
const progress = (s) => { try { writeFileSync("/tmp/e2e-progress", s + "\n", { flag: "a" }); } catch {} };
writeFileSync("/tmp/e2e-progress", "");

const serverPath = fileURLToPath(new URL("../server/index.js", import.meta.url));
const srv = spawn(process.execPath, [serverPath], { env: { ...process.env, PORT }, stdio: "ignore" });
progress("spawned");

for (let i = 0; i < 40; i++) {
  try { const r = await fetch(`${BASE}/api/health`); if (r.ok) break; } catch {}
  await sleep(200);
}
progress("health-ok");

const { chromium } = await import("playwright");
const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"] });
progress("browser-launched");

try {
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));

  const go = async (view) => { await page.click(`.nav-item[data-view="${view}"]`); await page.waitForTimeout(350); };
  const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true }); progress("shot:" + name); };

  // Clean, read-only / AI-only pages first (3-vendor seed, untouched weights).
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".rec-banner", { timeout: 10000 });
  await page.waitForTimeout(400);
  await shot("01-overview");

  await go("quotations");
  await shot("02-quotations");
  // Demonstrate AI quote parsing — show the parsed result but DON'T add it,
  // so the hero comparison stays on the canonical 3-vendor scenario.
  await page.click("#sample-btn");
  await page.click("#parse-btn");
  await page.waitForSelector("#add-parsed", { timeout: 10000 });
  await shot("03-parse-result");

  await go("comparison");
  await page.waitForSelector("table");
  const vendorRows = await page.$$eval("#content tbody tr", (n) => n.length);
  if (vendorRows !== 3) errors.push(`expected 3 vendors in comparison, got ${vendorRows}`);
  await shot("04-comparison");

  await go("recommendation");
  await page.click("#gen-explain");
  await page.waitForSelector(".ai-out", { timeout: 10000 });
  await page.waitForTimeout(300);
  await shot("05-recommendation");
  await page.fill("#dec-by", "R. Menon — Category Manager");
  await page.fill("#dec-reason", "Highest compliant score; free freight and Net 45 terms outweigh the higher unit price.");
  await page.click("#record-dec");
  await page.waitForTimeout(700);

  await page.waitForSelector("#content tbody tr", { timeout: 5000 });
  const rows = await page.$$eval("#content tbody tr", (n) => n.length);
  if (rows < 1) errors.push("no decision recorded in audit");
  await shot("06-audit");

  await go("emails");
  await page.click("#gen-email");
  await page.waitForSelector(".code-preview", { timeout: 10000 });
  await page.waitForTimeout(300);
  await shot("07-emails");

  await go("policy");
  await page.click(".suggest button");
  await page.waitForSelector(".qa-a", { timeout: 10000 });
  await page.waitForTimeout(600);
  await shot("08-policy");

  // Mutating demo LAST: change a weight and confirm the ranking recomputes live.
  await go("criteria");
  const before = await page.$eval("#live-rank", (n) => n.textContent);
  const slider = await page.$('#sliders input[type=range][data-key="unitPrice"]');
  await slider.focus();
  for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const after = await page.$eval("#live-rank", (n) => n.textContent);
  if (before === after) errors.push("ranking did not change after weight change");
  await shot("09-criteria");
} catch (e) {
  errors.push("walkthrough: " + (e && e.message ? e.message : String(e)));
} finally {
  await browser.close().catch(() => {});
  srv.kill("SIGTERM");
}

if (errors.length) { progress("ERRORS:" + JSON.stringify(errors)); }
else { progress("ALL-PASS"); }
writeFileSync("/tmp/e2e-result.json", JSON.stringify({ ok: errors.length === 0, errors }, null, 2));
process.exit(errors.length ? 1 : 0);
