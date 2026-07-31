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
  await screenshot(pageB, "messaging-desktop-five-column");

  const giftButton = pageB.getByRole("button", { name: /send a gift/i }).first();
  if (await giftButton.isVisible().catch(() => false)) {
    await giftButton.click();
    await pageB.getByRole("heading", { name: /send a gift to/i }).waitFor({ timeout: 5000 });
    record("pass", "Gift control opens from the message composer");
    await pageB.keyboard.press("Escape").catch(() => undefined);
  } else {
    record("fail", "Gift control is not visible in the message composer", { screenshot: await screenshot(pageB, "messaging-gift-missing") });
  }

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const mobilePage = await mobileContext.newPage();
  await login(mobilePage, memberB);
  await mobilePage.goto(`${baseUrl}/messages`, { waitUntil: "networkidle" });
  await mobilePage.getByRole("heading", { name: /conversations/i }).waitFor({ timeout: 8000 });
  await screenshot(mobilePage, "messaging-mobile-list");
  await mobilePage.getByRole("button", { name: new RegExp(memberA.email.split("@")[0], "i") }).first().click().catch(async () => {
    await mobilePage.locator("button").filter({ hasText: /member|power|admin|mali/i }).first().click();
  });
  await mobilePage.getByText(/back to list/i).waitFor({ timeout: 8000 });
  await screenshot(mobilePage, "messaging-mobile-chat");
  await mobilePage.getByRole("button", { name: /back to list/i }).click();
  await mobilePage.getByRole("heading", { name: /conversations/i }).waitFor({ timeout: 8000 });
  record("pass", "Mobile messages use list, chat, and Back master-detail flow");
  await mobileContext.close();

  await Promise.all([contextA.close(), contextB.close()]);
}

async function assertProfileEditor(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await login(page, memberA);
  await page.goto(`${baseUrl}/my-profile`, { waitUntil: "networkidle" });
  await page.getByText(/Preview mode shows how members see your profile/i).waitFor({ timeout: 8000 });
  await page.getByRole("link", { name: /edit profile/i }).waitFor({ timeout: 8000 });
  record("pass", "My Profile opens in read-only profile view first");
  await screenshot(page, "profile-view-first");
  await page.getByRole("link", { name: /edit profile/i }).click();
  await page.waitForURL((url) => url.pathname === "/my-profile" && url.searchParams.get("edit") === "1", { timeout: 8000 });

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
  const viewLink = await page.getByRole("link", { name: /view profile/i }).isVisible().catch(() => false);
  if (galleryText && viewLink) {
    record("pass", "Profile editor includes photo gallery area and view-profile affordance");
  } else {
    record("fail", "Profile editor missing gallery or view-profile affordance", { galleryText, viewLink, screenshot: await screenshot(page, "profile-gallery-view-missing") });
  }
  await screenshot(page, "profile-editor");

  await page.getByRole("button", { name: /save profile/i }).click();
  await page.waitForURL((url) => url.pathname === "/my-profile" && !url.searchParams.get("edit"), { timeout: 8000 });
  await page.getByText(/Preview mode shows how members see your profile/i).waitFor({ timeout: 8000 });
  record("pass", "Saving profile returns to read-only profile view");
  await screenshot(page, "profile-view-after-save");

  await context.close();
}

async function assertHomeHero(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();
  await login(page, memberA);
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
  const browseCta = await page.getByRole("link", { name: /browse matches/i }).first().isVisible().catch(() => false);
  const joinCta = await page.getByRole("link", { name: /join free now/i }).first().isVisible().catch(() => false);
  if (browseCta && !joinCta) {
    record("pass", "Signed-in home hero uses member CTA instead of Join Free Now");
  } else {
    record("fail", "Signed-in home hero CTA is incorrect", { browseCta, joinCta, screenshot: await screenshot(page, "home-cta-wrong") });
  }
  await screenshot(page, "home-signed-in-hero");
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
    await assertHomeHero(browser);
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
