import "dotenv/config";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3000";
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

const routes = [
  "/coming-soon",
  "/login",
  "/signup",
  "/dashboard",
  "/search",
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
  summary: { pages: 0, issues: 0, high: 0, medium: 0, low: 0 },
  issues: [],
};

function addIssue(severity, route, viewport, title, details = {}) {
  report.summary.issues += 1;
  report.summary[severity] += 1;
  report.issues.push({ severity, route, viewport, title, ...details });
}

function slug(value) {
  return value.replace(/^\//, "").replaceAll("/", "-").replace(/[^a-z0-9-]/gi, "") || "root";
}

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  await page.locator('input[type="email"]').fill(credentials.email);
  await page.locator('input[type="password"]').fill(credentials.password);
  await page.getByRole("button", { name: /^sign in$/i }).click();
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await page.waitForTimeout(500);
    await page.goto(`${baseUrl}/api/auth/session`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (body.includes(credentials.email)) return;
    await page.goto(`${baseUrl}/login`, { waitUntil: "networkidle" });
  }
  throw new Error("Could not create local admin session for visible UI audit.");
}

async function auditPage(page, route, viewport) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(250);
  report.summary.pages += 1;

  const snapshot = await page.evaluate(() => {
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

    function visible(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width >= 4 && rect.height >= 4 && style.visibility !== "hidden" && style.display !== "none" && Number(style.opacity) > 0.05;
    }

    function controlInfo(element) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = (element.textContent || "").replace(/\s+/g, " ").trim();
      const aria = element.getAttribute("aria-label") || "";
      const title = element.getAttribute("title") || "";
      const labelledBy = element.getAttribute("aria-labelledby") || "";
      const svgCount = element.querySelectorAll("svg").length;
      const imgCount = element.querySelectorAll("img").length;
      const role = element.getAttribute("role") || "";
      return {
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute("type") || "",
        href: element.getAttribute("href") || "",
        role,
        text,
        aria,
        title,
        labelledBy,
        svgCount,
        imgCount,
        disabled: Boolean(element.disabled) || element.getAttribute("aria-disabled") === "true",
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        color: style.color,
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        html: element.outerHTML.slice(0, 260),
      };
    }

    const controls = Array.from(document.querySelectorAll("button, a[href], input, select, textarea, [role='button'], [role='tab']"))
      .filter(visible)
      .map(controlInfo);

    const visibleText = document.body.innerText.replace(/\s+/g, " ").trim().toLowerCase();
    const headerControls = Array.from(document.querySelectorAll("header button, header a[href]"))
      .filter(visible)
      .map(controlInfo);

    const suspiciousCircles = controls.filter((item) => {
      const circleLike = Math.abs(item.rect.width - item.rect.height) <= 8 && item.rect.width >= 34 && item.rect.width <= 56;
      const hasUserMeaning = item.text || item.aria || item.title || item.labelledBy;
      const hasVisibleGraphic = item.svgCount || item.imgCount;
      return circleLike && (!hasUserMeaning || (!item.text && !hasVisibleGraphic));
    });

    const unlabeledControls = controls.filter((item) => {
      const isTextInput = ["input", "textarea", "select"].includes(item.tag);
      if (isTextInput) return false;
      const hasName = item.text || item.aria || item.title || item.labelledBy;
      return !hasName;
    });

    const textControls = controls.filter((item) => item.text && item.rect.width > 0 && item.rect.height > 0).map((item) => {
      const color = parseRgb(item.color);
      const background = parseRgb(item.backgroundColor);
      let contrast = null;
      if (color && background) {
        const light = Math.max(luminance(color), luminance(background));
        const dark = Math.min(luminance(color), luminance(background));
        contrast = Number(((light + 0.05) / (dark + 0.05)).toFixed(2));
      }
      return { ...item, contrast };
    });

    const lowContrastControls = textControls.filter((item) => item.contrast !== null && item.contrast < 3 && item.text.length <= 40);

    return {
      url: location.pathname + location.search,
      visibleText,
      headerControls,
      controls,
      suspiciousCircles,
      unlabeledControls,
      lowContrastControls: lowContrastControls.slice(0, 20),
    };
  });

  const screenshotBase = `${viewport.name}__${slug(route)}`;
  const screenshotPath = path.join(outputRoot, `visible-ui__${screenshotBase}.png`);

  const headerBlankControls = snapshot.headerControls.filter((item) => {
    const circleLike = Math.abs(item.rect.width - item.rect.height) <= 8 && item.rect.width >= 34 && item.rect.width <= 56;
    const noVisibleText = !item.text;
    const noGraphic = item.svgCount === 0 && item.imgCount === 0;
    return circleLike && noVisibleText && noGraphic;
  });

  if (headerBlankControls.length) {
    await page.screenshot({ path: screenshotPath, fullPage: true });
    addIssue("high", route, viewport.name, "Header shows blank circular controls", {
      controls: headerBlankControls,
      screenshot: screenshotPath,
    });
  }

  if (snapshot.unlabeledControls.length) {
    addIssue("high", route, viewport.name, "Visible clickable controls have no accessible/user-facing name", {
      controls: snapshot.unlabeledControls.slice(0, 12),
    });
  }

  const hasHeader = snapshot.headerControls.length > 0;
  const isAuthedRoute = !["/coming-soon", "/login", "/signup"].includes(route);
  if (isAuthedRoute && hasHeader && !snapshot.visibleText.includes("log out") && !snapshot.visibleText.includes("logout") && !snapshot.visibleText.includes("sign out")) {
    let menuText = "";
    const menuButtons = page.getByRole("button", { name: /open (account|more|menu)/i });
    const menuCount = await menuButtons.count();
    for (let index = 0; index < menuCount; index += 1) {
      const button = menuButtons.nth(index);
      if (await button.isVisible().catch(() => false)) {
        await button.click();
        await page.waitForTimeout(250);
        menuText = (await page.locator("body").innerText()).replace(/\s+/g, " ").trim().toLowerCase();
        break;
      }
    }

    if (!menuText.includes("log out") && !menuText.includes("logout") && !menuText.includes("sign out")) {
      addIssue("high", route, viewport.name, "No visible logout/sign-out option on authenticated page or account menu", {
        headerControls: snapshot.headerControls,
      });
    }
  }

  const importantLowContrast = snapshot.lowContrastControls.filter((item) => {
    const text = item.text.toLowerCase();
    return ["sign in", "create account", "admin", "save", "send", "launch", "live", "coming soon", "messages", "search"].some((needle) => text.includes(needle));
  });
  if (importantLowContrast.length) {
    addIssue("medium", route, viewport.name, "Important control text may have low contrast", {
      controls: importantLowContrast.slice(0, 10),
    });
  }

  if (route === "/admin") {
    const tabTexts = snapshot.controls.filter((item) => ["Launch", "Reports", "Verification", "Support & Appeals", "Members", "Economy", "God-Eye", "Audit Log"].includes(item.text));
    const clippedTabs = tabTexts.filter((item) => item.rect.x < 0 || item.rect.x + item.rect.width > (viewport.name === "mobile" ? 390 : viewport.name === "tablet" ? 820 : 1440));
    if (clippedTabs.length) {
      addIssue("medium", route, viewport.name, "Admin tab controls are clipped/off-screen", { controls: clippedTabs });
    }
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();
  const authContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const authPage = await authContext.newPage();
  await login(authPage);
  const storageState = await authContext.storageState();
  await authContext.close();

  for (const viewport of viewports) {
    const context = await browser.newContext({
      storageState,
      viewport: { width: viewport.width, height: viewport.height },
    });
    const page = await context.newPage();
    for (const route of routes) {
      await auditPage(page, route, viewport);
    }
    await context.close();
  }

  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(path.join(outputRoot, "visible-ui-audit.json"), JSON.stringify(report, null, 2));
  const markdown = [
    "# Visible UI Audit",
    "",
    `Base URL: ${baseUrl}`,
    `Finished: ${report.finishedAt}`,
    "",
    "## Summary",
    "",
    `- Pages audited: ${report.summary.pages}`,
    `- Issues: ${report.summary.issues}`,
    `- High: ${report.summary.high}`,
    `- Medium: ${report.summary.medium}`,
    `- Low: ${report.summary.low}`,
    "",
    "## Findings",
    "",
    ...report.issues.map((issue) => `- **${issue.severity.toUpperCase()}** ${issue.viewport} ${issue.route}: ${issue.title}`),
    "",
  ].join("\n");
  await writeFile(path.join(outputRoot, "visible-ui-audit.md"), markdown);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Report saved to: ${outputRoot}`);
}

main().catch(async (error) => {
  await mkdir(outputRoot, { recursive: true });
  report.finishedAt = new Date().toISOString();
  report.error = { message: error.message, stack: error.stack };
  await writeFile(path.join(outputRoot, "visible-ui-audit.json"), JSON.stringify(report, null, 2));
  console.error(error);
  process.exit(1);
});
