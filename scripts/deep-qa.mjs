import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
const outputRoot = process.env.QA_OUTPUT_DIR || path.join(process.cwd(), "qa-audit");
const credentials = {
  email: process.env.QA_EMAIL || process.env.UX_EMAIL || "admins@tmh.com",
  password: process.env.QA_PASSWORD || process.env.UX_PASSWORD || "ChangeMe123",
};

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const publicRoutes = [
  "/coming-soon",
  "/login",
  "/forgot-password",
  "/signup",
  "/about",
  "/how-to-use",
  "/membership-plans",
  "/safety-and-reporting",
  "/faq",
  "/contact-us",
  "/advertising-enquiries",
  "/privacy-policy",
  "/terms-and-conditions",
  "/cookie-policy",
];

const memberRoutes = [
  "/dashboard",
  "/search",
  "/profiles",
  "/messages",
  "/my-profile",
  "/reels",
  "/vip",
  "/likes",
  "/visitors",
  "/verify-me",
  "/admin",
];

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  summary: { checks: 0, passed: 0, warnings: 0, failed: 0 },
  issues: [],
  routeChecks: [],
  interactionChecks: [],
};

function record(kind, severity, name, details = {}) {
  report.summary.checks += 1;
  if (severity === "pass") report.summary.passed += 1;
  if (severity === "warning") report.summary.warnings += 1;
  if (severity === "fail") report.summary.failed += 1;
  const item = { kind, severity, name, ...details };
  report.issues.push(item);
  return item;
}

function routeSlug(route) {
  return route.replace(/^\//, "").replaceAll("/", "-").replace(/[^a-z0-9-]/gi, "") || "root";
}

async function instrument(page) {
  const events = { console: [], pageErrors: [], requestFailed: [], badResponses: [] };
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      events.console.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("pageerror", (error) => events.pageErrors.push({ message: error.message.slice(0, 500) }));
  page.on("requestfailed", (request) => {
    events.requestFailed.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || "unknown",
    });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !response.url().includes("/_next/webpack-hmr")) {
      events.badResponses.push({ url: response.url(), status });
    }
  });
  return events;
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const fixedBottom = Array.from(document.querySelectorAll("*"))
      .map((element) => {
        const styles = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
          position: styles.position,
          bottom: styles.bottom,
          height: Math.round(rect.height),
          width: Math.round(rect.width),
          top: Math.round(rect.top),
        };
      })
      .filter((item) => item.position === "fixed" && item.bottom === "0px" && item.height > 24);

    const overflowing = Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: (element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 70),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .filter((item) => item.width > 0 && (item.left < -2 || item.right > window.innerWidth + 2))
      .slice(0, 12);

    return {
      url: location.pathname + location.search,
      title: document.title,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      bodyPaddingBottom: getComputedStyle(body).paddingBottom,
      maxTopLevelPaddingBottom: Math.max(
        0,
        ...Array.from(body.children).map((element) => Number.parseFloat(getComputedStyle(element).paddingBottom) || 0)
      ),
      fixedBottom,
      overflowing,
    };
  });
}

async function screenshot(page, name) {
  const file = path.join(outputRoot, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function gotoAndAudit(page, events, route, viewportName, authLabel) {
  events.console.length = 0;
  events.pageErrors.length = 0;
  events.requestFailed.length = 0;
  events.badResponses.length = 0;

  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle", timeout: 30000 });
  const metrics = await pageMetrics(page);
  const check = {
    route,
    viewport: viewportName,
    auth: authLabel,
    finalUrl: page.url().replace(baseUrl, ""),
    status: response?.status() ?? null,
    metrics,
    events: structuredClone(events),
  };
  report.routeChecks.push(check);

  if (!response || response.status() >= 500) {
    record("route", "fail", `${authLabel} ${viewportName} ${route} returned server error`, { check });
    await screenshot(page, `fail__${authLabel}__${viewportName}__${routeSlug(route)}`);
  } else if (response.status() >= 400) {
    record("route", "warning", `${authLabel} ${viewportName} ${route} returned ${response.status()}`, { check });
  } else {
    record("route", "pass", `${authLabel} ${viewportName} ${route} loaded`, { finalUrl: check.finalUrl, status: check.status });
  }

  if (events.pageErrors.length || events.console.some((item) => item.type === "error")) {
    record("runtime", "fail", `${authLabel} ${viewportName} ${route} produced browser errors`, {
      pageErrors: events.pageErrors,
      console: events.console,
      screenshot: await screenshot(page, `runtime__${authLabel}__${viewportName}__${routeSlug(route)}`),
    });
  }

  const badResponses = events.badResponses.filter((item) => {
    const isExpectedAuthProbe = item.url.includes("/api/auth/session") && item.status === 401;
    return !isExpectedAuthProbe;
  });
  if (events.requestFailed.length || badResponses.length) {
    record("network", "warning", `${authLabel} ${viewportName} ${route} had failed requests or 4xx/5xx responses`, {
      requestFailed: events.requestFailed,
      badResponses,
    });
  }

  if (metrics.scrollWidth > metrics.clientWidth + 2 || metrics.overflowing.length) {
    record("layout", "fail", `${authLabel} ${viewportName} ${route} has horizontal overflow`, {
      scrollWidth: metrics.scrollWidth,
      clientWidth: metrics.clientWidth,
      overflowing: metrics.overflowing,
      screenshot: await screenshot(page, `overflow__${authLabel}__${viewportName}__${routeSlug(route)}`),
    });
  }

  const tallestFixedBottom = Math.max(0, ...metrics.fixedBottom.map((item) => item.height));
  if (viewportName === "mobile" && metrics.fixedBottom.length && metrics.bodyPaddingBottom === "0px" && metrics.maxTopLevelPaddingBottom < tallestFixedBottom) {
    record("layout", "fail", `${authLabel} mobile ${route} has fixed bottom UI without body bottom padding`, {
      fixedBottom: metrics.fixedBottom,
      bodyPaddingBottom: metrics.bodyPaddingBottom,
      maxTopLevelPaddingBottom: metrics.maxTopLevelPaddingBottom,
      screenshot: await screenshot(page, `fixed-bottom__${authLabel}__mobile__${routeSlug(route)}`),
    });
  }
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();

  let body = "";
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(500);
    await page.goto(`${baseUrl}/api/auth/session`, { waitUntil: "networkidle" });
    body = await page.locator("body").innerText();
    if (body.includes(credentials.email)) return;
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  }

  throw new Error(`Login failed for ${credentials.email}; session body was ${body}`);
}

async function testLoginFlows(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const events = await instrument(page);

  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill("wrong@example.com");
  await page.locator('input[type="password"]').fill("WrongPass123!");
  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.getByText(/incorrect|restricted/i).waitFor({ timeout: 10000 });
  record("interaction", "pass", "Invalid login shows an error");
  events.console.length = 0;
  events.pageErrors.length = 0;
  events.requestFailed.length = 0;
  events.badResponses.length = 0;

  await login(page);
  record("interaction", "pass", "Valid admin login creates a session");

  const unexpectedBadResponses = events.badResponses.filter((item) => item.status !== 401 || !item.url.includes("/api/auth/callback/credentials"));
  if (events.pageErrors.length || events.console.some((item) => item.type === "error") || unexpectedBadResponses.length) {
    record("runtime", "fail", "Login flow produced browser errors", { events });
  }

  const storageState = await context.storageState();
  await context.close();
  return storageState;
}

async function testAuthRedirects(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const finalPath = new URL(page.url()).pathname;
  if (finalPath === "/login") {
    record("auth", "pass", "Unauthenticated /dashboard redirects to /login");
  } else {
    record("auth", "fail", "Unauthenticated /dashboard did not redirect to /login", { finalUrl: page.url() });
  }
  await context.close();
}

async function testSafeInteractions(browser, storageState) {
  const context = await browser.newContext({ storageState, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const events = await instrument(page);

  await page.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /filters/i }).click();
  record("interaction", "pass", "Mobile search Filters button is clickable");
  await page.getByRole("button", { name: /scrolling cards/i }).click();
  await page.getByRole("button", { name: /swipe cards/i }).click();
  await page.getByRole("button", { name: /scrolling cards/i }).click();
  record("interaction", "pass", "Mobile search view-mode buttons are clickable");

  const likeButton = page.getByRole("button", { name: /like profile/i }).first();
  if (await likeButton.count()) {
    await likeButton.click();
    record("interaction", "pass", "Search Like profile button clicks without crashing");
  } else {
    record("interaction", "warning", "No Like profile button found on search");
  }

  const saveButton = page.getByRole("button", { name: /save profile/i }).first();
  if (await saveButton.count()) {
    await saveButton.click();
    record("interaction", "pass", "Search Save profile button clicks without crashing");
  } else {
    record("interaction", "warning", "No Save profile button found on search");
  }

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  for (const label of ["Reports", "Verification", "Support", "Members", "Economy", "God-Eye", "Audit Log", "Launch"]) {
    const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(150);
    } else {
      record("interaction", "warning", `Admin tab not found: ${label}`);
    }
  }
  record("interaction", "pass", "Admin tab buttons click through without crashing");

  await page.goto(`${baseUrl}/messages`, { waitUntil: "networkidle" });
  for (const label of ["All", "Favourites", "Archived"]) {
    const link = page.getByRole("link", { name: new RegExp(`^${label}$`, "i") }).first();
    if (await link.count()) {
      await link.click();
      await page.waitForLoadState("networkidle");
    } else {
      record("interaction", "warning", `Messages filter link not found: ${label}`);
    }
  }
  record("interaction", "pass", "Messages filter links click without crashing");

  if (events.pageErrors.length || events.console.some((item) => item.type === "error")) {
    record("runtime", "fail", "Safe interaction sweep produced browser errors", { events });
  }
  await context.close();
}

async function crawlRoutes(browser, storageState) {
  for (const viewport of viewports) {
    const publicContext = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const publicPage = await publicContext.newPage();
    const publicEvents = await instrument(publicPage);
    for (const route of publicRoutes) {
      await gotoAndAudit(publicPage, publicEvents, route, viewport.name, "public");
    }
    await publicContext.close();

    const authContext = await browser.newContext({ storageState, viewport: { width: viewport.width, height: viewport.height } });
    const authPage = await authContext.newPage();
    const authEvents = await instrument(authPage);
    for (const route of memberRoutes) {
      await gotoAndAudit(authPage, authEvents, route, viewport.name, "auth");
    }

    await authPage.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });
    const profileHref = await authPage.locator('a[href^="/profiles/"]').first().getAttribute("href").catch(() => null);
    if (profileHref) {
      await gotoAndAudit(authPage, authEvents, profileHref, viewport.name, "auth");
    } else {
      record("route", "warning", `Could not resolve profile detail URL at ${viewport.name}`);
    }
    await authContext.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();

  try {
    const ping = await fetch(`${baseUrl}/login`).catch((error) => ({ ok: false, status: 0, error }));
    if (!ping.ok) throw new Error(`Local server is not reachable at ${baseUrl}/login. Status: ${ping.status}`);

    await testAuthRedirects(browser);
    const storageState = await testLoginFlows(browser);
    await crawlRoutes(browser, storageState);
    await testSafeInteractions(browser, storageState);
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputRoot, "deep-qa-report.json"), JSON.stringify(report, null, 2));
  const markdown = [
    `# Deep QA Report`,
    ``,
    `Base URL: ${baseUrl}`,
    `Finished: ${report.finishedAt}`,
    ``,
    `## Summary`,
    ``,
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Failed: ${report.summary.failed}`,
    ``,
    `## Failures And Warnings`,
    ``,
    ...report.issues
      .filter((issue) => issue.severity !== "pass")
      .map((issue) => `- **${issue.severity.toUpperCase()}** ${issue.kind}: ${issue.name}`),
    ``,
  ].join("\n");
  await writeFile(path.join(outputRoot, "deep-qa-report.md"), markdown);

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report saved to: ${outputRoot}`);
}

main().catch(async (error) => {
  report.finishedAt = new Date().toISOString();
  record("runner", "fail", "Deep QA runner crashed", { message: error.message, stack: error.stack });
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "deep-qa-report.json"), JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
