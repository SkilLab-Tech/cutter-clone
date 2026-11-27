// T-013 check: vtracer WASM traces a 4 MP PNG in a worker in < 5 s and returns SVG paths,
// under the production CSP.
import { expect, test } from "./fixtures";

test("vtracer in a worker: 4 MP PNG → SVG in under 5 s", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.goto("/smoke/vetorizar");
  await expect(page.getByTestId("trace-result")).toBeVisible({ timeout: 30_000 });
  const traceMs = Number(await page.getByTestId("trace-ms").textContent());
  const initMs = Number(await page.getByTestId("trace-init-ms").textContent());
  const totalMs = Number(await page.getByTestId("trace-total-ms").textContent());
  const paths = Number(await page.getByTestId("trace-paths").textContent());
  test.info().annotations.push({
    type: "timing",
    description: `init ${initMs} ms, trace ${traceMs} ms, total ${totalMs} ms, ${paths} paths`,
  });
  console.log(
    `vtracer: init ${initMs} ms, trace ${traceMs} ms, total ${totalMs} ms, ${paths} paths`,
  );
  await expect(page.getByTestId("trace-head")).toContainText("<svg");
  expect(paths).toBeGreaterThan(10);
  expect(totalMs).toBeLessThan(5000);
  expect(errors).toEqual([]);
});
