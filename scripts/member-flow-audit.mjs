import "dotenv/config";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || process.env.UX_BASE_URL || "http://localhost:3000";
const outputRoot = process.env.QA_OUTPUT_DIR || path.join(process.cwd(), "qa-audit");
const memberA = {
  email: process.env.QA_MEMBER_A_EMAIL || process.env.TEST_MEMBER_EMAIL || "member@tmh.com",
  password: process.env.QA_MEMBER_A_PASSWORD || process.env.TEST_MEMBER_PASSWORD || "Member123!",
};
const memberB = {
  email: process.env.QA_MEMBER_B_EMAIL || "mali.demo@tmh.local",
  password: process.env.QA_MEMBER_B_PASSWORD || "DemoMember123",
};

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  summary: { checks: 0, passed: 0, failed: 0 },
  issues: [],
  screenshots: [],
};

function record(severity, name, details = {}) {
  report.summary.checks += 1;
  if (severity === "pass") report.summary.passed += 1;
  if (severity === "fail") report.summary.failed += 1;
  report.issues.push({ severity, name, ...details });
}

async function screenshot(page, name) {
  const file = path.join(outputRoot, `member-flow__${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file);
  return file;
}

async function login(page, credentials) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForTimeout(800);
  const session = await page.request.get(`${baseUrl}/api/auth/session`);
  const text = await session.text();
  if (!text.includes(credentials.email)) throw new Error(`Login failed for ${credentials.email}. Session: ${text.slice(0, 200)}`);
}

async function currentUser(page) {
  const response = await page.request.get(`${baseUrl}/api/auth/session`);
  const data = await response.json();
  if (!data?.user?.id) throw new Error("No signed-in user in session.");
  return data.user;
}

async function assertTwoUserMessaging(browser) {
  const [contextA, contextB] = await Promise.all([
    browser.newContext({ viewport: { width: 1280, height: 900 } }),
    browser.newContext({ viewport: { width: 1280, height: 900 } }),
  ]);
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  await login(pageA, memberA);
  await login(pageB, memberB);
  const [, userB] = await Promise.all([currentUser(pageA), currentUser(pageB)]);

  const create = await pageA.request.post(`${baseUrl}/api/messages/conversations`, { data: { participantId: userB.id } });
  const createData = await create.json();
  if (!create.ok() || !createData.conversationId) throw new Error(`Could not create conversation: ${JSON.stringify(createData)}`);
  const conversationId = createData.conversationId;

  await pageB.goto(`${baseUrl}/messages?conversation=${conversationId}`, { waitUntil: "networkidle" });
  await pageB.getByRole("heading", { name: /chat with/i }).waitFor({ timeout: 8000 }).catch(() => undefined);

  const body = `Polling QA ${Date.now()}`;
  const send = await pageA.request.post(`${baseUrl}/api/messages/conversations/${conversationId}/messages`, { data: { body, type: "TEXT" } });
  const sendData = await send.json();
  if (!send.ok() || !sendData.ok) throw new Error(`Could not send message: ${JSON.stringify(sendData)}`);

  await pageB.locator("p", { hasText: body }).first().waitFor({ timeout: 7000 });
  record("pass", "Second member sees incoming message without manual reload");
  await screenshot(pageB, "messaging-polling");

  await Promise.all([contextA.close(), contextB.close()]);
}

async function assertProfileEditor(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await login(page, memberA);
  await page.goto(`${baseUrl}/my-profile`, { waitUntil: "networkidle" });

  const labels = ["Account name", "Display name", "Gender", "Seeking", "Date of birth", "Age", "Height", "Smoking", "Drinking", "Languages", "Interests", "Goals"];
  const missing = [];
  for (const label of labels) {
    if (!(await page.getByLabel(label).count())) missing.push(label);
  }
  if (missing.length) {
    record("fail", "Profile editor is missing expected visible labels", { missing, screenshot: await screenshot(page, "profile-labels-missing") });
  } else {
    record("pass", "Profile editor exposes visible labels for core and lifestyle fields");
  }

  const galleryText = await page.getByText(/profile photos/i).first().isVisible().catch(() => false);
  const previewLink = await page.getByRole("link", { name: /preview profile/i }).isVisible().catch(() => false);
  if (galleryText && previewLink) {
    record("pass", "Profile editor includes photo gallery area and preview link");
  } else {
    record("fail", "Profile editor missing gallery or preview affordance", { galleryText, previewLink, screenshot: await screenshot(page, "profile-gallery-preview-missing") });
  }
  await screenshot(page, "profile-editor");

  await page.getByRole("link", { name: /preview profile/i }).click();
  await page.waitForURL((url) => url.pathname === "/my-profile" && url.searchParams.get("preview") === "1", { timeout: 8000 });
  await page.getByText(/Preview mode shows how members see your profile/i).waitFor({ timeout: 8000 });
  record("pass", "Profile preview opens in read-only self-preview mode");
  await screenshot(page, "profile-preview");

  await context.close();
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const ping = await fetch(`${baseUrl}/login`).catch(() => null);
  if (!ping?.ok) throw new Error(`Server is not reachable at ${baseUrl}/login`);

  const browser = await chromium.launch();
  try {
    await assertTwoUserMessaging(browser);
    await assertProfileEditor(browser);
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputRoot, "member-flow-audit.json"), JSON.stringify(report, null, 2));
  await writeFile(path.join(outputRoot, "member-flow-audit.md"), [
    "# Member Flow Audit",
    "",
    `Base URL: ${baseUrl}`,
    `Finished: ${report.finishedAt}`,
    "",
    "## Summary",
    "",
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Failed: ${report.summary.failed}`,
    "",
    "## Issues",
    "",
    ...report.issues.filter((issue) => issue.severity !== "pass").map((issue) => `- **${issue.severity.toUpperCase()}** ${issue.name}`),
    "",
    "## Screenshots",
    "",
    ...report.screenshots.map((file) => `- ${file}`),
    "",
  ].join("\n"));
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.failed > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  record("fail", "Member flow audit crashed", { message: error.message, stack: error.stack });
  report.finishedAt = new Date().toISOString();
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "member-flow-audit.json"), JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
