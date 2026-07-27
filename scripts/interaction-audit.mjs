import "dotenv/config";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || process.env.UX_BASE_URL || "http://localhost:3000";
const outputRoot = process.env.QA_OUTPUT_DIR || path.join(process.cwd(), "qa-audit");
const credentials = {
  email: process.env.QA_EMAIL || process.env.UX_EMAIL || process.env.ADMIN_EMAIL || "admins@tmh.com",
  password: process.env.QA_PASSWORD || process.env.UX_PASSWORD || process.env.ADMIN_PASSWORD || "ChangeMe123",
};

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "desktop", width: 1440, height: 900 },
];

const report = {
  baseUrl,
  startedAt: new Date().toISOString(),
  summary: { checks: 0, passed: 0, warnings: 0, failed: 0 },
  issues: [],
  screenshots: [],
};

function record(severity, name, details = {}) {
  report.summary.checks += 1;
  if (severity === "pass") report.summary.passed += 1;
  if (severity === "warning") report.summary.warnings += 1;
  if (severity === "fail") report.summary.failed += 1;
  report.issues.push({ severity, name, ...details });
}

function slug(value) {
  return value.replace(/^\//, "").replaceAll("/", "-").replace(/[^a-z0-9-]/gi, "") || "root";
}

async function screenshot(page, name) {
  const file = path.join(outputRoot, `interaction__${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  report.screenshots.push(file);
  return file;
}

async function resetEvents(page) {
  const events = { console: [], pageErrors: [], badResponses: [], requestFailed: [] };
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      events.console.push({ type: message.type(), text: message.text().slice(0, 500) });
    }
  });
  page.on("pageerror", (error) => events.pageErrors.push({ message: error.message.slice(0, 500) }));
  page.on("requestfailed", (request) => {
    events.requestFailed.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || "unknown" });
  });
  page.on("response", (response) => {
    const status = response.status();
    if (status >= 400 && !response.url().includes("/_next/webpack-hmr")) {
      events.badResponses.push({ url: response.url(), status });
    }
  });
  return events;
}

function unexpectedNetwork(events) {
  return {
    pageErrors: events.pageErrors,
    console: events.console.filter((item) => item.type === "error"),
    requestFailed: events.requestFailed,
    badResponses: events.badResponses.filter((item) => {
      const expectedAuthProbe = item.url.includes("/api/auth/session") && item.status === 401;
      const expectedInvalidLogin = item.url.includes("/api/auth/callback/credentials") && item.status === 401;
      return !expectedAuthProbe && !expectedInvalidLogin;
    }),
  };
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

async function getVisibleControlIssues(page) {
  return page.evaluate(() => {
    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width >= 4 && rect.height >= 4 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
    }

    return Array.from(document.querySelectorAll("button, a[href], [role='button'], [role='tab']"))
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = (element.textContent || "").replace(/\s+/g, " ").trim();
        const aria = element.getAttribute("aria-label") || "";
        const title = element.getAttribute("title") || "";
        const svgCount = element.querySelectorAll("svg").length;
        const imgCount = element.querySelectorAll("img").length;
        const circleLike = Math.abs(rect.width - rect.height) <= 8 && rect.width >= 34 && rect.width <= 56;
        return {
          text,
          aria,
          title,
          svgCount,
          imgCount,
          circleLike,
          rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
          html: element.outerHTML.slice(0, 240),
        };
      })
      .filter((item) => {
        const hasName = item.text || item.aria || item.title;
        const hasGraphic = item.svgCount || item.imgCount;
        return !hasName || (item.circleLike && !item.text && !hasGraphic);
      });
  });
}

async function getContrastForTexts(page, labels) {
  return page.evaluate((wantedLabels) => {
    function parseRgb(value) {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
    }

    function luminance(parts) {
      const [r, g, b] = parts.map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    function contrast(colorValue, backgroundValue) {
      const color = parseRgb(colorValue);
      const background = parseRgb(backgroundValue);
      if (!color || !background) return null;
      const light = Math.max(luminance(color), luminance(background));
      const dark = Math.min(luminance(color), luminance(background));
      return Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
    }

    function effectiveBackground(element) {
      let current = element;
      while (current) {
        const color = getComputedStyle(current).backgroundColor;
        if (color && !color.endsWith(", 0)") && color !== "transparent" && color !== "rgba(0, 0, 0, 0)") return color;
        current = current.parentElement;
      }
      return "rgb(255, 255, 255)";
    }

    return wantedLabels.map((label) => {
      const element = Array.from(document.querySelectorAll("button, a[href]")).find((candidate) => (candidate.textContent || "").replace(/\s+/g, " ").trim().toLowerCase().includes(label.toLowerCase()));
      if (!element) return { label, found: false };
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        label,
        found: true,
        color: style.color,
        backgroundColor: effectiveBackground(element),
        contrast: contrast(style.color, effectiveBackground(element)),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    });
  }, labels);
}

async function assertNoVisibleControlIssues(page, contextName) {
  const issues = await getVisibleControlIssues(page);
  if (issues.length) {
    record("fail", `${contextName} has blank or unnamed visible controls`, {
      controls: issues.slice(0, 12),
      screenshot: await screenshot(page, `bad-controls__${slug(contextName)}`),
    });
  } else {
    record("pass", `${contextName} has named, nonblank visible controls`);
  }
}

async function openAccountDrawer(page, viewportName, route) {
  const menuButton = page.getByRole("button", { name: /open (account|more) menu/i }).first();
  if (!(await menuButton.count())) {
    record("fail", `${viewportName} ${route} account/more menu button not found`);
    return;
  }

  await menuButton.click();
  await page.getByRole("heading", { name: /more/i }).waitFor({ timeout: 5000 });
  const closeButton = page.getByRole("button", { name: /close menu/i });
  const signOutButton = page.getByRole("button", { name: /sign out/i });
  if ((await closeButton.count()) && (await closeButton.first().isVisible()) && (await signOutButton.count()) && (await signOutButton.first().isVisible())) {
    record("pass", `${viewportName} ${route} account drawer opens with visible close and Sign out`);
  } else {
    record("fail", `${viewportName} ${route} account drawer missing visible close or Sign out`, {
      screenshot: await screenshot(page, `drawer-missing-control__${viewportName}__${slug(route)}`),
    });
  }

  await assertNoVisibleControlIssues(page, `${viewportName} ${route} opened drawer`);
  await screenshot(page, `drawer-open__${viewportName}__${slug(route)}`);
  await closeButton.first().click();
}

async function openNotifications(page, viewportName, route) {
  const button = page.getByRole("button", { name: /notifications/i }).first();
  if (!(await button.count())) {
    record("warning", `${viewportName} ${route} notifications button not found`);
    return;
  }

  await button.click();
  await page.waitForTimeout(250);
  const hasPopover = await page.getByText(/new likes|unread message|open messages/i).first().isVisible().catch(() => false);
  if (hasPopover) {
    record("pass", `${viewportName} ${route} notifications popover opens`);
    await assertNoVisibleControlIssues(page, `${viewportName} ${route} notifications popover`);
    await screenshot(page, `notifications-open__${viewportName}__${slug(route)}`);
  } else {
    record("fail", `${viewportName} ${route} notifications popover did not open`, {
      screenshot: await screenshot(page, `notifications-failed__${viewportName}__${slug(route)}`),
    });
  }
}

async function auditHeaderAndHome(browser, storageState, viewport) {
  const context = await browser.newContext({ storageState, viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  const events = await resetEvents(page);

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await assertNoVisibleControlIssues(page, `${viewport.name} dashboard header`);
  await openAccountDrawer(page, viewport.name, "/dashboard");
  await openNotifications(page, viewport.name, "/dashboard");

  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  await page.locator('header a[href="/"]').first().click();
  await page.waitForURL((url) => url.pathname === "/", { timeout: 8000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  const pathname = new URL(page.url()).pathname;
  const memberHeaderOnHome = await page.getByRole("button", { name: /open (account|more) menu/i }).first().isVisible().catch(() => false);
  if (pathname === "/" && memberHeaderOnHome) {
    record("pass", `${viewport.name} logo opens Home with signed-in member header`);
    await screenshot(page, `signed-in-home__${viewport.name}`);
  } else {
    record("fail", `${viewport.name} logo/home behavior is wrong`, {
      pathname,
      memberHeaderOnHome,
      screenshot: await screenshot(page, `signed-in-home-failed__${viewport.name}`),
    });
  }

  const bad = unexpectedNetwork(events);
  if (bad.pageErrors.length || bad.console.length || bad.requestFailed.length || bad.badResponses.length) {
    record("fail", `${viewport.name} header/home interactions produced runtime/network errors`, bad);
  }

  await context.close();
}

async function auditDashboardQuickActions(browser, storageState, viewport) {
  const context = await browser.newContext({ storageState, viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: "networkidle" });
  const contrasts = await getContrastForTexts(page, ["Browse matches", "Edit profile", "Verify me"]);
  const missing = contrasts.filter((item) => !item.found);
  const low = contrasts.filter((item) => item.found && item.contrast !== null && item.contrast < 3);
  if (missing.length || low.length) {
    record("fail", `${viewport.name} dashboard quick actions are missing or low contrast`, {
      missing,
      low,
      contrasts,
      screenshot: await screenshot(page, `quick-actions-bad__${viewport.name}`),
    });
  } else {
    record("pass", `${viewport.name} dashboard quick actions are visible with acceptable contrast`, { contrasts });
    await screenshot(page, `quick-actions__${viewport.name}`);
  }
  await context.close();
}

async function auditSearch(browser, storageState, viewport) {
  const context = await browser.newContext({ storageState, viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });

  for (const label of [/filters/i, /scrolling cards/i, /swipe cards/i]) {
    const control = page.getByRole("button", { name: label }).first();
    if (await control.count()) {
      await control.click();
      await page.waitForTimeout(200);
      record("pass", `${viewport.name} search control clicked: ${label}`);
    } else if (viewport.name === "desktop") {
      record("pass", `${viewport.name} search control intentionally absent: ${label}`);
    } else {
      record("warning", `${viewport.name} search control missing: ${label}`);
    }
  }

  await assertNoVisibleControlIssues(page, `${viewport.name} search interacted state`);
  await screenshot(page, `search-interacted__${viewport.name}`);
  await context.close();
}

async function auditAdminTabs(browser, storageState, viewport) {
  const context = await browser.newContext({ storageState, viewport: { width: viewport.width, height: viewport.height } });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });

  for (const label of ["Launch", "Reports", "Verification", "Support", "Members", "Economy", "God-Eye", "Audit Log"]) {
    const tab = page.getByRole("button", { name: new RegExp(label, "i") }).first();
    if (await tab.count()) {
      await tab.click();
      await page.waitForTimeout(150);
      record("pass", `${viewport.name} admin tab clicked: ${label}`);
    } else {
      record("fail", `${viewport.name} admin tab missing: ${label}`);
    }
  }

  await assertNoVisibleControlIssues(page, `${viewport.name} admin interacted state`);
  await screenshot(page, `admin-tabs__${viewport.name}`);
  await context.close();
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();
  const loginContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const loginPage = await loginContext.newPage();

  try {
    const ping = await fetch(`${baseUrl}/login`).catch((error) => ({ ok: false, status: 0, error }));
    if (!ping.ok) throw new Error(`Local server is not reachable at ${baseUrl}/login. Status: ${ping.status}`);

    await login(loginPage);
    const storageState = await loginContext.storageState();
    await loginContext.close();

    for (const viewport of viewports) {
      await auditHeaderAndHome(browser, storageState, viewport);
      await auditDashboardQuickActions(browser, storageState, viewport);
      await auditSearch(browser, storageState, viewport);
      await auditAdminTabs(browser, storageState, viewport);
    }
  } finally {
    await browser.close();
  }

  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputRoot, "interaction-audit.json"), JSON.stringify(report, null, 2));
  const markdown = [
    "# Interaction Audit",
    "",
    `Base URL: ${baseUrl}`,
    `Finished: ${report.finishedAt}`,
    "",
    "## Summary",
    "",
    `- Checks: ${report.summary.checks}`,
    `- Passed: ${report.summary.passed}`,
    `- Warnings: ${report.summary.warnings}`,
    `- Failed: ${report.summary.failed}`,
    "",
    "## Failures And Warnings",
    "",
    ...report.issues
      .filter((issue) => issue.severity !== "pass")
      .map((issue) => `- **${issue.severity.toUpperCase()}** ${issue.name}`),
    "",
    "## Screenshots",
    "",
    ...report.screenshots.map((file) => `- ${file}`),
    "",
  ].join("\n");
  await writeFile(path.join(outputRoot, "interaction-audit.md"), markdown);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report saved to: ${outputRoot}`);

  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(async (error) => {
  record("fail", "Interaction audit runner crashed", { message: error.message, stack: error.stack });
  report.finishedAt = new Date().toISOString();
  await mkdir(outputRoot, { recursive: true });
  await writeFile(path.join(outputRoot, "interaction-audit.json"), JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
