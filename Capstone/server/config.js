/**
 * config.js — tiny zero-dependency .env loader + runtime config.
 * Reads a local ".env" (if present) into process.env without any packages.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../.env", import.meta.url));
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
  anthropicBase: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
};

export const aiEnabled = Boolean(config.anthropicKey);
