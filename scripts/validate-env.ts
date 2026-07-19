import { readFileSync, existsSync } from "node:fs";
import { URL } from "node:url";

const files = [".env", ".env.local"].filter(existsSync);
const required = ["DATABASE_URL", "DIRECT_URL", "AUTH_SECRET", "NEXT_PUBLIC_APP_URL"];
const errors: string[] = [];
const values = new Map<string, { file: string; value: string }>();

for (const file of files) {
  const seen = new Set<string>();
  for (const [index, raw] of readFileSync(file, "utf8").split(/\r?\n/).entries()) {
    const match = raw.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, encoded] = match;
    if (seen.has(key)) errors.push(`${file}:${index + 1} defines ${key} more than once.`);
    seen.add(key);
    const value = encoded.replace(/^(["'])(.*)\1$/, "$2");
    const previous = values.get(key);
    if (previous && previous.value !== value)
      errors.push(`${key} conflicts between ${previous.file} and ${file}.`);
    values.set(key, { file, value });
  }
}

if (!files.length) errors.push("No environment file was found.");
if (files.length > 1) errors.push("Use one authoritative .env file; remove conflicting environment files.");
for (const key of required) if (!values.get(key)?.value) errors.push(`${key} is required.`);

const authSecret = values.get("AUTH_SECRET")?.value || "";
if (authSecret.length < 32) errors.push("AUTH_SECRET must contain at least 32 characters.");
if (process.env.NODE_ENV === "production" && /replace|example|development|secret/i.test(authSecret))
  errors.push("AUTH_SECRET is unsafe for production.");

function databaseIdentity(key: string) {
  const value = values.get(key)?.value;
  if (!value) return null;
  try {
    const url = new URL(value);
    return { host: url.hostname.replace("-pooler", ""), database: url.pathname };
  } catch {
    errors.push(`${key} is not a valid PostgreSQL URL.`);
    return null;
  }
}

const pooled = databaseIdentity("DATABASE_URL");
const direct = databaseIdentity("DIRECT_URL");
if (pooled && direct && (pooled.host !== direct.host || pooled.database !== direct.database))
  errors.push("DATABASE_URL and DIRECT_URL resolve to different database identities.");

const openAiKey = values.get("OPENAI_API_KEY")?.value || values.get("AI_API_KEY")?.value;
if (values.get("OPENAI_MODEL")?.value && !openAiKey)
  errors.push("OPENAI_MODEL requires OPENAI_API_KEY.");

if (errors.length) {
  console.error(`Environment validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("Environment validation passed. One consistent database identity is configured.");
}
