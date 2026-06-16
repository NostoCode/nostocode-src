import { test, expect } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Email").fill("testuser@example.com");
  await page.getByPlaceholder("Password").fill("Test123456!");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/(dashboard|problems)/, { timeout: 20_000 });
}

async function openFirstProblem(page: import("@playwright/test").Page) {
  await page.goto("/problems");
  const firstProblem = page.locator('a[href^="/problem/"]').first();
  await firstProblem.waitFor({ state: "visible", timeout: 15_000 });
  await firstProblem.click();
  await page.waitForURL(/\/problem\//);
  await page.locator(".monaco-editor").waitFor({ state: "visible", timeout: 20_000 });
}

test.describe("Code execution", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await openFirstProblem(page);
  });

  test("Run button triggers code execution", async ({ page }) => {
    const header = page.locator("header");
    await header.getByRole("button", { name: "Run" }).click();
    await expect(page.getByText("Code run successfully")).toBeVisible({ timeout: 30_000 });
  });

  test("Submit button records a submission", async ({ page }) => {
    const header = page.locator("header");
    await header.getByRole("button", { name: "Submit" }).click();
    await expect(page.getByText("Code submitted successfully")).toBeVisible({ timeout: 45_000 });
  });

  test("external paste is blocked in Ancient Coding Mode", async ({ page }) => {
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.evaluate(() => navigator.clipboard.writeText("print('injected')"));

    const editor = page.locator(".monaco-editor").first();
    await editor.click();
    const mod = process.platform === "darwin" ? "Meta" : "Control";
    await page.keyboard.press(`${mod}+V`);

    await expect(
      page.getByText("External paste is disabled in Ancient Coding Mode")
    ).toBeVisible({ timeout: 5_000 });
  });
});