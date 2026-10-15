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
