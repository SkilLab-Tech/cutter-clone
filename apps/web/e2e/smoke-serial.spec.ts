// T-010 check: mocked-serial e2e for the /smoke route and the standalone smoke.html.
// BP-DEV-001 (sim part): connect, busy port, cable pulled, unsupported browser.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import {
  installSerialMock,
  mockPush,
  mockState,
  mockUnplug,
  type SerialMockConfig,
} from "./serial-mock";

const FIXTURE = Array.from(
  readFileSync(
    fileURLToPath(
      new URL("../../../packages/core/test/fixtures/hpgl/square-25mm.plt", import.meta.url),
    ),
  ),
);
const SMOKE_HTML_FILE = fileURLToPath(new URL("../public/smoke.html", import.meta.url));

const PAGES = [
  { name: "/smoke route", url: "/smoke" },
  { name: "standalone smoke.html", url: "/smoke.html" },
] as const;

async function openPage(page: Page, url: string, cfg: SerialMockConfig = {}) {
  await installSerialMock(page, cfg);
  await page.goto(url);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}

async function openAdvanced(page: Page) {
  await page.getByText("Avançado", { exact: true }).click();
}

const status = (page: Page) => page.getByRole("status");

for (const p of PAGES) {
  test.describe(p.name, () => {
    test("connects and cuts the 25 mm square: bytes equal the T-009 fixture", async ({ page }) => {
      await openPage(page, p.url);
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(status(page)).toContainText("Conectado");
      await page.getByRole("button", { name: "Cortar quadrado de teste" }).click();
      await expect(status(page)).toContainText("Enviado");
      const state = await mockState(page);
      expect(state.writes.flat()).toEqual(FIXTURE);
      expect(state.openOptions).toMatchObject({
        baudRate: 38400,
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });
      await openAdvanced(page);
      await expect(page.getByRole("log")).toContainText(
        "IN;PU0,0;PD1000,0,1000,1000,0,1000,0,0;PU;",
      );
    });

    test("uses the chosen baud, parity and flow control", async ({ page }) => {
      await openPage(page, p.url);
      await openAdvanced(page);
      await page.getByLabel("Velocidade da porta (baud)").selectOption("19200");
      await page.getByLabel("Paridade").selectOption("even");
      await page.getByLabel("Controle de fluxo").selectOption("hardware");
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(status(page)).toContainText("Conectado");
      expect((await mockState(page)).openOptions).toMatchObject({
        baudRate: 19200,
        parity: "even",
        flowControl: "hardware",
      });
      await expect(page.getByLabel("Velocidade da porta (baud)")).toBeDisabled();
    });

    test("shows bytes received from the port", async ({ page }) => {
      await openPage(page, p.url);
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(status(page)).toContainText("Conectado");
      await mockPush(page, [0x4f, 0x4b, 0x0d]);
      await openAdvanced(page);
      await expect(page.getByRole("log")).toContainText("4f 4b 0d | OK·");
    });

    test("software XON/XOFF holds the square until XON arrives", async ({ page }) => {
      await openPage(page, p.url, { xoffOnOpen: true });
      await openAdvanced(page);
      await page.getByLabel(/XON\/XOFF por software/).check();
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(page.getByRole("log")).toContainText("13 | ·");
      await page.getByRole("button", { name: "Cortar quadrado de teste" }).click();
      await page.waitForTimeout(300);
      expect((await mockState(page)).writes).toEqual([]);
      await mockPush(page, [0x11]);
      await expect.poll(async () => (await mockState(page)).writes.flat()).toEqual(FIXTURE);
    });

    test("busy port: says another program is using it", async ({ page }) => {
      await openPage(page, p.url, { busy: true });
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(page.getByRole("alert")).toContainText("A porta está em uso por outro programa");
      await expect(page.getByRole("button", { name: "Conectar plotter" })).toBeEnabled();
    });

    test("picker closed: says no port was chosen", async ({ page }) => {
      await openPage(page, p.url, { cancelPicker: true });
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(page.getByRole("alert")).toContainText("Nenhuma porta foi escolhida.");
    });

    test("cable pulled: status reads Desconectado within 2 s and explains the knife", async ({
      page,
    }) => {
      await openPage(page, p.url);
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(status(page)).toContainText("Conectado");
      await mockUnplug(page);
      await expect(status(page)).toContainText("Desconectado", { timeout: 2000 });
      await expect(page.getByRole("alert")).toContainText("botão de pausa no painel");
      await expect(page.getByRole("button", { name: "Conectar plotter" })).toBeVisible();
    });

    test("disconnect closes the port", async ({ page }) => {
      await openPage(page, p.url);
      await page.getByRole("button", { name: "Conectar plotter" }).click();
      await expect(status(page)).toContainText("Conectado");
      await page.getByRole("button", { name: "Desconectar" }).click();
      await expect(status(page)).toContainText("Desconectado");
      expect((await mockState(page)).closed).toBe(true);
    });

    test("unsupported browser: shows the banner and no connect button", async ({ page }) => {
      await openPage(page, p.url, { unsupported: true });
      await expect(page.getByRole("alert")).toContainText("Use o Chrome ou o Edge");
      await expect(page.getByRole("button", { name: "Conectar plotter" })).toHaveCount(0);
    });

    test("no serious or critical axe violations", async ({ page }) => {
      await openPage(page, p.url);
      await openAdvanced(page);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  });
}

test("smoke.html works when opened from disk (file://) with the mocked port", async ({ page }) => {
  await installSerialMock(page);
  await page.goto(`file://${SMOKE_HTML_FILE}`);
  await page.getByRole("button", { name: "Conectar plotter" }).click();
  await expect(status(page)).toContainText("Conectado");
  await page.getByRole("button", { name: "Cortar quadrado de teste" }).click();
  await expect(status(page)).toContainText("Enviado");
  expect((await mockState(page)).writes.flat()).toEqual(FIXTURE);
});

test("/smoke is hidden from the navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('nav a[href="/smoke"]')).toHaveCount(0);
});
