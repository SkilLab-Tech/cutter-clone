# Protocol evidence

Record here, with method and date, what was learned about each cutter (U-01..U-04). Behavior-only: vendor docs/support, files the vendor app saves, or bytes on our own port when the EULA allows (U-06). Never decompiled code.

## Does Web Serial work from a page opened as `file://`? (2026-11-27)

Context: gate G-1 (T-010/T-011). `apps/web/public/smoke.html` is a single file with no
dependencies, meant to be copied to the workshop laptop and opened in Chrome.

**Answer: yes in Chromium, with caveats. Confidence: high that the API is reachable; not yet
checked on Chrome desktop for Windows with a real port.**

Method and evidence:

1. **Spec / MDN (primary docs).** Web Serial is available only in secure contexts
   (https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API). MDN's Secure Contexts page
   lists `file:///path/to/resource.html` as "Secure (`file` URL)" and `file` as a potentially
   trustworthy scheme (https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
2. **Chromium source (primary).** `third_party/blink/renderer/modules/serial/serial.cc` (main,
   fetched 2026-11-27 from chromium.googlesource.com): `ShouldBlockSerialServiceCall()` rejects
   with SecurityError "Access to the Web Serial API is denied from contexts where the top-level
   document has an opaque origin", then checks the `serial` permissions policy. Both `getPorts()`
   and `requestPort()` call it, and `requestPort()` also needs a user gesture.
3. **Empirical run (our machine).** Playwright 1.65.1 Docker image, Chromium headless shell
   159.0.8154.6, a blank page loaded once as `file:///probe/probe.html` and once from
   `http://localhost:8765/`:

   | | `file://` | `http://localhost` |
   |---|---|---|
   | `self.origin` | `"null"` | `http://localhost:8765` |
   | `isSecureContext` | `true` | `true` |
   | `"serial" in navigator` | `true` | `true` |
   | `navigator.serial.getPorts()` | resolved, 0 ports | resolved, 0 ports |
   | `navigator.serial.requestPort()` | `NotFoundError: No port selected by the user.` | same |

   `NotFoundError` comes from the picker step (headless auto-cancels it), so the origin check
   passed: Blink does not treat the `file://` top-level origin as opaque, even though it
   serializes as `"null"`.

Caveats (still to observe at the partner workshop, T-011):

- Not yet run on Chrome stable for Windows with the C48 plugged in.
- Permission persistence: the serialized origin is `"null"`, so a port granted on `file://` may
  not be remembered after a reload. `smoke.html` asks for the port on every connect, so this does
  not block the test.
- An enterprise policy (`SerialBlockedForUrls`, `DefaultSerialGuardSetting`) can block Web Serial
  on any origin.
- Firefox ≥ 151 has Web Serial (research-2026-11-26.md); its behaviour on `file://` was not
  tested. Use Chrome or Edge for the smoke test.

**If `file://` fails at the partner workshop**, any of these works with no change to the file:

- Serve it on localhost (a secure context): `npx serve apps/web/public` or
  `python -m http.server 8080` in the folder with `smoke.html`, then open
  `http://localhost:8080/smoke.html` (or `http://localhost:3000/smoke.html` with `serve`).
- The app's hidden `/smoke` route or `/smoke.html` on the HTTPS host once Ivan deploys to
  Cloudflare Pages (`https://<project>.pages.dev/smoke.html`).

## U-02 smoke test — results go here (T-011)

Fill in at the partner workshop: date, Chrome version, COM port and driver (H-02), settings that worked
(baud, parity, flow control, XON/XOFF), bytes sent and received as shown by `smoke.html`, and
the measured square (target 25.0 mm per side).
