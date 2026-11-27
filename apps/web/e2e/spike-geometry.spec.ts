// T-012 check (browser part): Clipper2 offset runs in a Vite module worker under the app CSP,
// and a 25 mm square + 2 mm comes back 29 × 29 mm ±0.01.
import { expect, test } from "./fixtures";

for (const join of ["miter", "round"] as const) {
  test(`Clipper2 in a worker: ${join} offset is 29 × 29 mm ±0.01`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });
    await page.goto("/smoke/geometria");
    const width = page.getByTestId(`offset-${join}-width`);
    await expect(width).toBeVisible();
    const w = Number(await width.textContent());
    const h = Number(await page.getByTestId(`offset-${join}-height`).textContent());
    expect(Math.abs(w - 29)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(h - 29)).toBeLessThanOrEqual(0.01);
    expect(errors).toEqual([]);
  });
}
