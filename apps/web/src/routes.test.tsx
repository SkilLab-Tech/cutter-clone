// T-003 check: each route renders, with its empty / loading / error placeholders.
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { routes } from "./routes";
import { SCREENS } from "./screens/registry";
import { t } from "./i18n/t";

afterEach(cleanup);

function renderAt(url: string) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  return render(<RouterProvider router={router} />);
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
        const { container } = renderAt(s.path);
        expect(
          screen.getByRole("heading", { level: 1, name: t(`screens.${s.key}.title`) }),
        ).toBeTruthy();
        expect(container.querySelector(`[data-screen="${s.id}"]`)?.getAttribute("data-state")).toBe(
          "empty",
        );
        expect(screen.getByText(t(`screens.${s.key}.empty`))).toBeTruthy();
      });

      it("renders the loading state as a live status", () => {
        renderAt(`${s.path}?estado=carregando`);
        expect(screen.getByRole("status").textContent).toContain(t(`screens.${s.key}.loading`));
      });

      it("renders the error state as an alert", () => {
        renderAt(`${s.path}?estado=erro`);
        expect(screen.getByRole("alert").textContent).toContain(t(`screens.${s.key}.error`));
      });
    });
  }

  it("shows a not-found page for unknown paths", () => {
    renderAt("/nao-existe");
    expect(screen.getByRole("heading", { level: 1, name: t("app.notFound.title") })).toBeTruthy();
  });

  it("never shows an untranslated key", () => {
    for (const s of SCREENS) {
      for (const field of ["title", "empty", "loading", "error"]) {
        const key = `screens.${s.key}.${field}`;
        expect(t(key)).not.toBe(key);
      }
    }
  });
});
