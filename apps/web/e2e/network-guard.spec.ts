// T-007 check: a request to example.com is blocked and fails the test (BP-NFR-003 infra).
import { expect, test } from "./fixtures";

test("the guard blocks a fetch to example.com", async ({ page, networkGuard }) => {
  await page.goto("/");
  const outcome = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/");
      return "reached";
    } catch {
      return "blocked";
    }
  });
  expect(outcome).toBe("blocked");
  await expect.poll(() => [...networkGuard.blocked]).toEqual(["https://example.com/"]);
  // This test made the request on purpose; acknowledge it so it can end green.
  networkGuard.acknowledge("https://example.com/");
});

test("a stray request outside the origin fails the test", async ({ page }) => {
  test.fail(true, "expected: the network guard must fail any test that leaves the origin");
  await page.goto("/");
  await page.evaluate(async () => {
    await fetch("https://example.com/").catch(() => undefined);
  });
});

test("same-origin requests are allowed", async ({ page, networkGuard }) => {
  await page.goto("/sobre");
  await expect(page.getByRole("heading", { level: 1, name: "Sobre" })).toBeVisible();
  expect(networkGuard.blocked).toEqual([]);
});
