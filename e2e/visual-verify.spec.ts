import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const SCREENSHOT_DIR = path.join(__dirname, "../test-results/screenshots");

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill("testuser@example.com");
  await page.getByPlaceholder("Password").fill("Test123456!");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|problems)/, { timeout: 20_000 });
}

test.beforeAll(() => {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
});

test.describe("Visual verification screenshots", () => {
  test("problems list and problem page with Run/Submit in nav row", async ({ page }) => {
    await signIn(page);
    await page.goto("/problems");
    await expect(page.getByRole("heading", { name: "All Problems" })).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "01-problems-list.png"), fullPage: true });

    await page.locator('a[href^="/problem/"]').first().click();
    await page.waitForURL(/\/problem\//);
    await page.locator(".monaco-editor").waitFor({ state: "visible", timeout: 20_000 });

    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Run" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Submit" })).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "02-problem-run-submit-portal.png"),
      fullPage: true,
    });
  });

  test("theme toggle switches label", async ({ page }) => {
    await page.goto("/problems");
    const toggle = page.getByRole("button", { name: /Modern|Ancient/ });
    await expect(toggle).toBeVisible();
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "03-theme-before.png") });

    const before = await toggle.textContent();
    await toggle.click();
    await expect(toggle).not.toHaveText(before ?? "");
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "04-theme-after.png") });
  });

  test("modern light dashboard readable text", async ({ page }) => {
    await signIn(page);
    const toggle = page.getByRole("button", { name: /Modern|Ancient/ });
    if ((await toggle.textContent())?.includes("Modern")) {
      await toggle.click();
      await page.waitForTimeout(400);
    }
    const modeToggle = page.locator('[data-testid="mode-toggle"], button:has-text("Light"), button:has-text("Dark")').first();
    if (await modeToggle.isVisible().catch(() => false)) {
      await modeToggle.click();
    }
    const url = page.url();
    const userId = url.match(/\/(dashboard)\/([a-f0-9]+)/)?.[2];
    if (userId) await page.goto(`/dashboard/${userId}`);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "06-dashboard-modern-light.png"), fullPage: true });
  });

  test("dashboard loads after sign-in", async ({ page }) => {
    await signIn(page);
    const url = page.url();
    const dashMatch = url.match(/\/(dashboard)\/([a-f0-9]+)/);
    const userId = dashMatch?.[2];
    if (userId) {
      await page.goto(`/dashboard/${userId}`);
    }
    await expect(page.locator("body")).toBeVisible();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "05-dashboard.png"), fullPage: true });
  });
});