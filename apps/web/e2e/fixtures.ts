// BP-NFR-003 network guard: every e2e test fails if the page tries to reach anything outside
// the app origin. Import `test` and `expect` from this file, never from @playwright/test.
import { test as base, expect } from "@playwright/test";

export interface NetworkGuard {
  /** URLs that were blocked because they left the app origin. */
  readonly blocked: readonly string[];
  /** Marks a blocked URL as expected (only for tests of the guard itself). */
  acknowledge(url: string): void;
}

export const test = base.extend<{ networkGuard: NetworkGuard }>({
  networkGuard: [
    async ({ context, baseURL }, use, testInfo) => {
      if (baseURL === undefined) throw new Error("network guard needs use.baseURL");
      const appOrigin = new URL(baseURL).origin;
      const blocked: string[] = [];

      await context.route("**/*", async (route) => {
        const url = route.request().url();
        if (new URL(url).origin === appOrigin) {
          await route.continue();
        } else {
          blocked.push(url);
          await route.abort("blockedbyclient");
        }
      });
      // The app's CSP (connect-src 'self') stops most stray requests before they reach the
      // network, so the route above never sees them. Count CSP violations as attempts too.
      await context.exposeBinding("__networkGuardCsp", (_source, blockedURI: unknown) => {
        if (typeof blockedURI !== "string") return;
        if (blockedURI === "" || blockedURI === "inline" || blockedURI === "eval") return;
        let origin: string;
        try {
          origin = new URL(blockedURI).origin;
        } catch {
          return;
        }
        if (origin !== appOrigin && !blocked.includes(blockedURI)) blocked.push(blockedURI);
      });
      await context.addInitScript(() => {
        const report = (window as unknown as { __networkGuardCsp: (u: string) => void })
          .__networkGuardCsp;
        document.addEventListener("securitypolicyviolation", (e) => {
          void report(e.blockedURI);
        });
      });
      await context.routeWebSocket(/.*/, (ws) => {
        const url = ws.url();
        if (new URL(url).host !== new URL(appOrigin).host) {
          blocked.push(url);
          void ws.close({ code: 1008, reason: "network guard" });
        } else {
          ws.connectToServer();
        }
      });

      await use({
        blocked,
        acknowledge(url) {
          const i = blocked.indexOf(url);
          if (i === -1) throw new Error(`network guard: ${url} was not blocked`);
          blocked.splice(i, 1);
        },
      });

      // Flush in-flight CSP reports: a round trip on each page runs after queued bindings.
      for (const p of context.pages()) await p.evaluate(() => 0).catch(() => undefined);
      if (blocked.length > 0) {
        await testInfo.attach("blocked-requests", { body: blocked.join("\n") });
      }
      expect(blocked, `requests outside ${appOrigin} (BP-NFR-003)`).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
