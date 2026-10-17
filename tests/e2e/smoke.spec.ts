import { expect, test } from "@playwright/test";

test("login page renders and public health endpoint reports liveness", async ({ page, request, baseURL }) => {
  const pageResponse = await page.goto("/login");
  expect(pageResponse?.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: /balsathi ai/i })).toBeVisible();

  const healthResponse = await request.get(`${baseURL}/api/health`);
  expect(healthResponse.ok()).toBeTruthy();
  const health = await healthResponse.json();
  expect(health).toMatchObject({ status: "ok" });
  if (health.mode === "sqlite") {
    await expect(page.getByText("Quick Demo Login")).toHaveCount(0);
    await expect(page.getByText(/Demo password for all accounts/)).toHaveCount(0);
    await expect(page.getByText(/SQLite mode/)).toBeVisible();
  }
});

test("forecast endpoint rejects unauthenticated access", async ({ request, baseURL }) => {
  for (const response of [
    await request.get(`${baseURL}/api/v1/analytics/forecast`),
    await request.post(`${baseURL}/api/v1/analytics/forecast`),
  ]) {
    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("UNAUTHORIZED");
    expect(JSON.stringify(body)).not.toMatch(/fullname|childid|passwordhash/i);
  }
});

test("unauthenticated browser is redirected away from admin pages", async ({ page }) => {
  await page.goto("/admin/notifications");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: /balsathi ai/i })).toBeVisible();
});


test("demo account can change language, sees honest support availability, and signs out", async ({ page, baseURL }) => {
  const health = await page.request.get(`${baseURL}/api/health`);
  const status = await health.json();
  test.skip(status.mode !== "demo", "The end-to-end demo-account journey uses only isolated in-memory demo data.");

  await page.goto("/login");
  await page.locator('input[type="email"]').fill("admin@balsathi.demo");
  await page.locator('input[type="password"]').fill("balsathi123");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  await expect(page.getByText(/Notification preferences and delivery are not configured/)).toBeVisible();
  await page.getByRole("button", { name: /मराठी/ }).click();
  await expect.poll(async () => page.evaluate(async () => (await (await fetch("/api/auth/session")).json()).preferredLanguage)).toBe("mr");

  await page.goto("/help");
  await expect(page.getByText(/Support message delivery is not configured/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Send Message" })).toHaveCount(0);

  await page.goto("/settings");
  await page.getByRole("button", { name: /Sign Out/ }).click();
  await expect(page).toHaveURL(/\/login$/);
});
