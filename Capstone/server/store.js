/**
 * store.js — JSON-file persistence for application state.
 * State lives in data/state.json (git-ignored). On first run it is seeded.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { defaultState } from "./seed.js";

const statePath = fileURLToPath(new URL("../data/state.json", import.meta.url));

let cache = null;

export function load() {
  if (cache) return cache;
  if (existsSync(statePath)) {
    try {
      cache = JSON.parse(readFileSync(statePath, "utf8"));
      return cache;
    } catch {
      // corrupt file -> reseed
    }
  }
  cache = defaultState();
  save(cache);
  return cache;
}

export function save(state) {
  cache = state;
  mkdirSync(dirname(statePath), { recursive: true });
  writeFileSync(statePath, JSON.stringify(state, null, 2));
  return cache;
}

export function reset() {
  cache = defaultState();
  save(cache);
  return cache;
}

export function update(mutator) {
  const state = load();
  mutator(state);
  return save(state);
}
