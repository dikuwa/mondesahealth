/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const base = process.env.E2E_BASE_URL || "http://localhost:3103";
const email = process.env.E2E_OWNER_EMAIL;
const password = process.env.E2E_OWNER_PASSWORD;
if (!email || !password) throw new Error("E2E owner credentials are required.");

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(path, options = {}, attempts = 3) {
  let response;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(180_000) });
    if (response.status < 500) return response;
    await pause(attempt * 1500);
  }
  return response;
}

(async () => {
  const report = {};
  const login = await request("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  if (!login.ok) throw new Error(`Login failed: ${login.status} ${await login.text()}`);
  const cookie = login.headers.getSetCookie()[0].split(";")[0];
  const headers = { Cookie: cookie, "Content-Type": "application/json" };

  const stateResponse = await request("/api/platform/landing-page", { headers });
  if (!stateResponse.ok) throw new Error(`Draft load failed: ${stateResponse.status}`);
  const state = await stateResponse.json();
  const originalAnnouncement = state.published.general.announcement;
  const draftMarker = `Lifecycle draft ${Date.now()}`;
  state.draft.general.announcement = draftMarker;

  const save = await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "SAVE_DRAFT", content: state.draft }) });
  report.draftSaves = save.ok;
  const publicBefore = await (await request("/")).text();
  report.draftHiddenPublicly = !publicBefore.includes(draftMarker);
  const preview = await (await request("/preview/landing", { headers })).text();
  report.previewShowsDraft = preview.includes(draftMarker);

  const publish = await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "PUBLISH" }) });
  report.publishSucceeds = publish.ok;
  const publicAfter = await (await request("/")).text();
  report.publishUpdatesPublic = publicAfter.includes(draftMarker);

  const changed = structuredClone(state.draft);
  changed.general.announcement = "Restore-only marker";
  await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "SAVE_DRAFT", content: changed }) });
  const restore = await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "RESTORE" }) });
  const restored = await restore.json();
  report.restoreRevertsDraft = restore.ok && restored.content.general.announcement === draftMarker;

  const resetContent = structuredClone(restored.content);
  resetContent.general.announcement = originalAnnouncement;
  await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "SAVE_DRAFT", content: resetContent }) });
  report.validationRejectsUnsafeLinks = (await request("/api/platform/landing-page", { method: "PATCH", headers, body: JSON.stringify({ action: "SAVE_DRAFT", content: { ...resetContent, general: { ...resetContent.general, primaryCtaDestination: "javascript:alert(1)" } } }) })).status === 400;

  report.failures = Object.entries(report).filter(([, value]) => value === false).map(([key]) => key);
  fs.mkdirSync("e2e-artifacts/landing", { recursive: true });
  fs.writeFileSync("e2e-artifacts/landing/lifecycle-report.json", `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.failures.length ? 1 : 0);
})().catch((error) => {
  fs.mkdirSync("e2e-artifacts/landing", { recursive: true });
  fs.writeFileSync("e2e-artifacts/landing/lifecycle-error.txt", `${error?.stack || error}\n`);
  console.error(error);
  process.exit(1);
});
