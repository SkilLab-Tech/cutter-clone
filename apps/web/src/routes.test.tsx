// T-003 check: each route renders, with its empty / loading / error placeholders.
// T-008: both locales render every screen without missing keys.
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import { SCREENS } from "./screens/registry";
import { createI18n, LANGUAGES, missingKeys, type Language } from "./i18n";

afterEach(cleanup);
beforeEach(() => {
  missingKeys.length = 0;
});

function renderAt(url: string, lng: Language = "pt-BR") {
  const i18n = createI18n(lng);
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>,
  );
  return { t: (key: string) => i18n.t(key), container: document.body };
}

describe("app routes", () => {
  it("has exactly the 10 screens of blueprint §4", () => {
    expect(SCREENS.map((s) => s.id)).toEqual([
      "S-01",
      "S-02",
      "S-03",
      "S-04",
      "S-05",
      "S-06",
      "S-07",
      "S-08",
      "S-09",
      "S-10",
    ]);
  });

  for (const s of SCREENS) {
    describe(`${s.id} ${s.path}`, () => {
      it("renders its title and empty state by default", () => {
        const { t, container } = renderAt(s.path);
        expect(
          screen.getByRole("heading", { level: 1, name: t(`screens.${s.key}.title`) }),
        ).toBeTruthy();
        expect(container.querySelector(`[data-screen="${s.id}"]`)?.getAttribute("data-state")).toBe(
          "empty",
        );
        expect(screen.getByText(t(`screens.${s.key}.empty`))).toBeTruthy();
      });

      it("renders the loading state as a live status", () => {
        const { t } = renderAt(`${s.path}?estado=carregando`);
        expect(screen.getByRole("status").textContent).toContain(t(`screens.${s.key}.loading`));
      });

      it("renders the error state as an alert", () => {
        const { t } = renderAt(`${s.path}?estado=erro`);
        expect(screen.getByRole("alert").textContent).toContain(t(`screens.${s.key}.error`));
      });
    });
  }

  it("shows a not-found page for unknown paths", () => {
    const { t } = renderAt("/nao-existe");
    expect(screen.getByRole("heading", { level: 1, name: t("app.notFound.title") })).toBeTruthy();
  });
});

describe("i18n (BP-UX-007)", () => {
  it("defaults to pt-BR", () => {
    renderAt("/");
    expect(screen.getByRole("heading", { level: 1, name: "Início" })).toBeTruthy();
  });

  it("renders en", () => {
    renderAt("/", "en");
    expect(screen.getByRole("heading", { level: 1, name: "Start" })).toBeTruthy();
  });

  for (const lng of LANGUAGES) {
    it(`${lng}: every screen and state renders with no missing key`, () => {
      for (const s of SCREENS) {
        for (const estado of ["vazio", "carregando", "erro"]) {
          renderAt(`${s.path}?estado=${estado}`, lng);
          cleanup();
        }
      }
      renderAt("/nao-existe", lng);
      expect(missingKeys).toEqual([]);
    });
  }
});
