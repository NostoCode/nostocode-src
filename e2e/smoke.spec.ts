import { test, expect } from "@playwright/test";

test.describe("NostoCode smoke", () => {
  test("problems list loads with server-rendered content", async ({ page }) => {
    await page.goto("/problems");
    await expect(page.getByRole("heading", { name: "All Problems" })).toBeVisible();
    await expect(page.getByPlaceholder("Search questions")).toBeVisible();
  });

  test("problem page shows Run/Submit in header nav row", async ({ page }) => {
    await page.goto("/problems");
    const firstProblem = page.locator('a[href^="/problem/"]').first();
    await expect(firstProblem).toBeVisible({ timeout: 15_000 });
    await firstProblem.click();
    await page.waitForURL(/\/problem\//);

    await expect(page.getByRole("link", { name: "Problem List" })).toBeVisible();
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Run" })).toBeVisible({ timeout: 15_000 });
    await expect(header.getByRole("button", { name: "Submit" })).toBeVisible();
  });

  test("theme toggle switches Ancient/Modern label", async ({ page }) => {
    await page.goto("/problems");
    const toggle = page.getByRole("button", { name: /Modern|Ancient/ });
    await expect(toggle).toBeVisible();
    const before = await toggle.textContent();
    await toggle.click();
    await expect(toggle).not.toHaveText(before ?? "");
  });

  test("signed-in user can open a problem editor", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByPlaceholder("Email").fill("testuser@example.com");
    await page.getByPlaceholder("Password").fill("Test123456!");
    await page.locator("form").getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/(dashboard|problems)/, { timeout: 20_000 });

    await page.goto("/problems");
    await page.locator('a[href^="/problem/"]').first().click();
    await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 20_000 });
  });
});