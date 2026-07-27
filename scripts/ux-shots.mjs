import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.UX_BASE_URL || "http://localhost:3000";
const outputRoot = process.env.UX_OUTPUT_DIR || path.join(process.cwd(), "ux-audit");
const credentials = {
  email: process.env.UX_EMAIL || "admins@tmh.com",
  password: process.env.UX_PASSWORD || "ChangeMe123",
};

const standardViewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 900 },
];

const heavyViewports = [
  ...standardViewports,
  { name: "tablet", width: 820, height: 1180 },
];

const pages = [
  { name: "coming-soon", url: "/coming-soon", auth: false, viewports: standardViewports },
  { name: "login", url: "/login", auth: false, viewports: standardViewports },
  { name: "dashboard", url: "/dashboard", auth: true, viewports: standardViewports },
  { name: "search", url: "/search", auth: true, viewports: heavyViewports },
  { name: "profile-detail", url: null, auth: true, viewports: heavyViewports },
  { name: "messages", url: "/messages", auth: true, viewports: heavyViewports },
  { name: "my-profile", url: "/my-profile", auth: true, viewports: heavyViewports },
  { name: "reels", url: "/reels", auth: true, viewports: standardViewports },
  { name: "vip", url: "/vip", auth: true, viewports: standardViewports },
  { name: "likes", url: "/likes", auth: true, viewports: standardViewports },
  { name: "visitors", url: "/visitors", auth: true, viewports: standardViewports },
  { name: "admin", url: "/admin", auth: true, viewports: heavyViewports },
  { name: "admin-launch", url: "/admin", auth: true, viewports: heavyViewports, setup: openAdminLaunchTab },
];

function fileName(pageName, viewportName) {
  return `${pageName}__${viewportName}.png`;
}

async function waitForApp(page) {
  const response = await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  if (!response || response.status() >= 500) {
    throw new Error(`Local app did not respond cleanly at ${baseUrl}. Status: ${response?.status() ?? "none"}`);
  }
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await Promise.all([
    page.waitForURL(/\/dashboard|\/admin|\/search|\/coming-soon/, { timeout: 15000 }).catch(() => undefined),
    page.getByRole("button", { name: /^sign in$/i }).click(),
  ]);
  await page.waitForLoadState("networkidle");

  const sessionResponse = await page.goto(`${baseUrl}/api/auth/session`, { waitUntil: "networkidle" });
  if (!sessionResponse || sessionResponse.status() >= 400) {
    throw new Error(`Unable to verify session. Status: ${sessionResponse?.status() ?? "none"}`);
  }
  const session = await page.locator("body").innerText();
  if (!session.includes(credentials.email)) {
    throw new Error(`Login did not create the expected session for ${credentials.email}. Session body: ${session}`);
  }
}

async function resolveProfileUrl(page) {
  await page.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });
  const profileLink = page.locator('a[href^="/profiles/"]').first();
  await profileLink.waitFor({ timeout: 10000 });
  const href = await profileLink.getAttribute("href");
  if (!href) throw new Error("Could not find a profile detail link on /search.");
  return href;
}

async function openAdminLaunchTab(page) {
  const launchTab = page.getByRole("button", { name: /launch/i }).first();
  if (await launchTab.count()) {
    await launchTab.click();
    await page.waitForTimeout(400);
  }
}

async function capture(browser, storageState, profileUrl, pageSpec, viewport) {
  const context = await browser.newContext({
    storageState: pageSpec.auth ? storageState : undefined,
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  const targetUrl = pageSpec.url || profileUrl;
  if (!targetUrl) throw new Error(`No URL resolved for ${pageSpec.name}.`);

  await page.goto(`${baseUrl}${targetUrl}`, { waitUntil: "networkidle" });
  if (pageSpec.setup) await pageSpec.setup(page);
  await page.screenshot({
    path: path.join(outputRoot, fileName(pageSpec.name, viewport.name)),
    fullPage: true,
  });
  await context.close();
}

async function main() {
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch();
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const authPage = await authContext.newPage();
  authPage.setDefaultTimeout(20000);

  await waitForApp(authPage);
  await login(authPage);
  const profileUrl = await resolveProfileUrl(authPage);
  const storageState = await authContext.storageState();
  await authContext.close();

  let count = 0;
  for (const pageSpec of pages) {
    for (const viewport of pageSpec.viewports) {
      await capture(browser, storageState, profileUrl, pageSpec, viewport);
      count += 1;
      console.log(`Captured ${pageSpec.name} ${viewport.name}`);
    }
  }

  await browser.close();
  console.log(`\nSaved ${count} screenshots to: ${outputRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
