import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const formStateFile = path.join(repoRoot, "hooks", "useTunnelState.ts");
const requiredKeysFile = path.join(
  repoRoot,
  "scripts",
  "guardrails",
  "formstate-required-keys.json"
);

function fail(msg) {
  console.error(`GUARDRAILS FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(formStateFile)) fail(`Missing file: ${formStateFile}`);
if (!fs.existsSync(requiredKeysFile)) fail(`Missing file: ${requiredKeysFile}`);

const src = fs.readFileSync(formStateFile, "utf8");
const requiredKeys = JSON.parse(fs.readFileSync(requiredKeysFile, "utf8"));

if (!Array.isArray(requiredKeys) || requiredKeys.some((k) => typeof k !== "string")) {
  fail("Invalid JSON: formstate-required-keys.json must be an array of strings.");
}

// Very small/robust-ish check: each required key must appear as a property in TunnelFormState.
// We keep this intentionally simple to avoid heavyweight parsing.
const missing = [];
for (const key of requiredKeys) {
  const re = new RegExp(`\\b${key}\\s*:`, "m");
  if (!re.test(src)) missing.push(key);
}

if (missing.length > 0) {
  fail(
    `TunnelFormState is missing required keys (${missing.length}): ${missing.join(", ")}`
  );
}

console.log("GUARDRAILS OK: TunnelFormState required keys are present.");

