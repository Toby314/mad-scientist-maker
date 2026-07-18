# Phase 4 Plan — iPhone / PWA Polish

**Project:** Mad Scientist Maker (offline-first ESP32 project recommender)
**Status entering Phase 4:** Phase 3 shipped as `v3.0.0` — 67 parts, 33 catalog
projects, 33 compile-verified ESP32-S3 sketches, guided custom-part creator, and
CYD first-class mode. 65/65 DOM tests + full engine suite passing.
**Two stated target platforms:** the CYD (ESP32 + TFT) and the iPhone. Phases 1–3
were feature-complete on desktop; Phase 4 hardens the *iPhone* half and **proves**
the "offline-first" claim instead of asserting it.

---

## Principle
The PWA foundation already exists (`manifest.webmanifest` + `sw.js` service worker).
Phase 4 is **polish + proof**, not new architecture. Every sub-task has a concrete
**done-when** verification, because Toby's rule is *verify before deliver*.

---

## 4A — Install + touch targets
**Goal:** one-tap-ish install and thumb-friendly controls on a phone.

1. **In-app install prompt**
   - Capture `beforeinstallprompt` and show a small "Install app" banner/button
     (currently install only works via the browser's manual "Add to Home Screen").
   - **iOS Safari caveat:** it does NOT fire `beforeinstallprompt`. Detect Safari
     on iOS and instead show a one-time hint: "Share → Add to Home Screen". WHY:
     shipping one code path would silently fail on half of Toby's target devices.
   - Files: `app.js` (prompt capture + UA detect), `index.html` (banner markup),
     `css/styles.css` (banner styles).

2. **Touch targets ≥ 44×44pt**
   - Audit every interactive element: tab buttons, filter checkboxes, inventory
     rows, project cards, Copy button, settings toggles.
   - Enforce `min-height/min-width: 44px` (Apple HIG minimum) on those selectors.
   - **Done-when:** a computed-style check (or screenshot at 390px) shows no
     tappable control under 44px.

## 4B — Responsive layout + offline proof
**Goal:** no horizontal scroll / zoom on a phone, and a *real* offline test.

3. **Mobile breakpoint pass**
   - Add a `@media (max-width: 480px)` block. Make the topic `<select>` + filter
     row **wrap**; ensure the CYD panel and "Buildable/Could've" headers stack.
   - Ensure the detail-view sketch `code-block` is horizontally scrollable
     (`overflow:auto`) so a long line scrolls the box, **not** the whole page.
   - **Done-when:** renders clean at 375×667 (iPhone SE) and 390×844 (iPhone 14)
     with no page-level horizontal scroll.

4. **Offline round-trip (the real test)**  ⚠️ **FLAG — environment caveat**
   - Serve over `http`, load once (primes `sw.js` cache), then take the tab
     **offline** (headless Chromium `page.setOfflineMode(true)`, or documented
     DevTools steps if no browser binary is installable here).
   - Assert: (a) app shell still loads, (b) a buildable result still renders,
     (c) the service worker `cache.match` returns the shell.
   - Commit the offline-check script + a short `OFFLINE_TEST.md` procedure.
   - **Done-when:** the offline script exits 0 and the artifact is in the repo.
     WHY: "offline-first" is a core promise — we prove it, not claim it.
   - **⚠️ FLAG FOR TOBY AT APPROVAL:** this sub-task ideally runs under a headless
     Chromium. If no browser binary is installable in the build environment, I'll
     fall back to documented DevTools/offline steps — either way it ships as a
     repeatable artifact, but the *automated* exit-0 gate may be a manual
     procedure rather than a CI script. Calling this out now so there are no
     surprises when 4B is built.

## 4C — iOS meta + icons
**Goal:** correct standalone launch + home-screen icon on iPhone.

5. **viewport + apple meta**
   - `index.html` `<head>`: `viewport-fit=cover`, sane `user-scalable`,
     `apple-mobile-web-app-capable=yes`,
     `apple-mobile-web-app-status-bar-style`, and `apple-touch-icon` link(s).
   - Confirm `manifest.webmanifest` has `display: standalone` + correct icons.
   - Add an `apple-touch-icon.png` (180×180) if missing; reference existing
     `icon-192/512` as PNG fallbacks.
   - **Done-when:** standalone launch confirmed (meta present + manifest valid);
     an `apple-touch-icon` resolves 200.

## 4D — CYD × iPhone parity
6. **No layout fight** between the two targets: confirm the CYD focus panel and
   the "Optimize for CYD" toggle stay usable at 375px (panel stacks above the
   buildable list, toggle in Settings is ≥44px). **Done-when:** 4A–4C checks pass
   with `cydMode` on and off.

---

## Tests to add (kept green with the existing 65/65 DOM suite)
- DOM assertion: install banner appears when `beforeinstallprompt` is stubbed;
  iOS hint appears under a Safari-UA stub.
- DOM assertion: at a mocked 390px viewport, no element overflows the viewport
  width (or a `data-overflow` flag is absent).
- Engine/Shell: offline round-trip script exits 0 (new `offline.test.*`).

## Out of scope for Phase 4 (deferred)
- New catalog projects / new sketches (Phase 3 scope is sufficient; revisit later).
- Backend/sync (stays offline-only by design).

## Suggested delivery order
4A → 4B → 4C → 4D, each committed + tested before the next. Final commit gets a
`v4.0.0` tag + release, same pattern as Phase 3.

## Approval ask
Approve as-is · Approve with changes (note which) · Defer (queue for later).
No build work begins until you say go.
