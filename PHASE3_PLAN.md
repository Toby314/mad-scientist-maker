# Mad Scientist Maker — Phase 3 Recommendations

> **Status:** DRAFT for Toby's review. Phase 2 is built + tested (48 DOM assertions pass,
> engine tests pass) but **NOT yet committed to GitHub** — waiting for your go-ahead.
> This doc is the spec-first plan for what comes next, so we agree on scope before more code.

---

## Where Phase 2 leaves us (so Phase 3 builds on solid ground)

- **Inventory:** checkbox + quantity steppers, JSON export + import round-trip, and a
  custom-part editor (you can add your own mystery boards by capability tokens).
- **Projects:** buildable / near-miss lists, honest counts, a "filtered" note, difficulty +
  topic filters, an **offline** "Surprise me" (random buildable/near pick) and an optional
  AI "Surprise me" (key required).
- **Learning:** a 🎓 tab with 6 curated skill tracks that auto-check off steps you can build.
- **Engine:** pure + unit-tested (capability matching, 1–3 near window, moreLike,
  filterProjects, learningPaths). Runs in Node, so we verify without a browser.

**What Phase 2 deliberately did NOT do** (the gaps Phase 3 should close):
1. The app still ships **no actual code** in project cards — just steps + wiring tables.
   For a maker, copy-paste Arduino/CircuitPython is the payoff.
2. The custom-part editor is **capability-token-only** — you must know the exact token
   vocabulary. A beginner can't easily guess `display-spi-tft`.
3. Inventory is **manual typing** — no scan of a parts bin, no "I have this exact SKU."
4. No **sharing** of a project recommendation (the hash route exists but isn't surfaced
   as a "share this list" action).
5. The **CYD** (your preferred hardware) isn't a first-class experience yet — it's just
   another board in the taxonomy.

---

## Phase 3 — proposed scope (ranked, not all required)

### 3A. Copy-paste code in project cards  ★ highest value
- Add `code: [{file, lang, source}]` to catalog projects and render it in the detail view
  inside a `<pre>` with a "Copy" button (and a language label).
- **Why:** the whole point of the app is *building*. Wiring tables teach the WHY; code
  closes the loop to *doing*. Start with the 5–6 beginner projects (blink, button, dimmer,
  weather, OLED) so a new maker gets a win in the first session.
- **Effort:** medium. Catalog authoring is the bulk; the UI is small (we already have
  `detail.js`).
- **Teach angle:** each snippet ships with a one-line "what this line does" comment so the
  code is a reading exercise, not a black box.

### 3B. Guided custom-part creator (no token memorizing)  ★ high value, low effort
- Replace the raw `caps` text box with a **checklist of capabilities grouped by type**
  (MCU, Sensor, Display, Radio, Power, Motor…) drawn from `taxonomy.js`. Tick what your
  board does; we assemble the tokens for you.
- Optionally auto-suggest caps from a similar board (pick "like ESP32" → pre-tick its caps).
- **Why:** removes the #1 friction we just introduced in 2B. Matches your "teach by doing"
  preference — you learn the capability vocabulary *by selecting*, not by recalling.
- **Effort:** small. Reuses `T.CAPABILITY_CANONICAL` + `T.PARTS`.

### 3C. "What's one thing to buy?" — smarter shopping  ★ medium value
- Today the shopping list is sorted by leverage. Add: a **"buy this bundle"** view that
  groups the top N near-misses and shows the *minimum set of parts* to maximize new builds
  (a small set-cover). Plus a one-tap copy of the whole cart as a shopping list.
- **Why:** turns "here are 14 parts" into "buy these 3 and you unlock 6 projects." Leverage
  made actionable.
- **Effort:** medium (set-cover is a few lines; UI is the work).

### 3D. CYD first-class mode  ★ your stated preference
- A toggle "Optimize for CYD" that (a) auto-adds `cyd` to inventory context, (b) filters
  project cards to those whose required caps a CYD can satisfy, (c) shows TFT/Touch-specific
  wiring notes. Pairs with your real hardware.
- **Why:** you specifically called out CYD as the target device. Makes the app feel built
  *for* your bench, not generic.
- **Effort:** small–medium. Mostly filtering + a couple of catalog annotations.

### 3E. Share / export a recommendation  ★ nice-to-have
- "Share my buildables" → copies a Markdown list + the `#/project/<id>` links, or exports a
  signed JSON you can send a friend (they import into their own app).
- **Why:** the hash routes already exist; surfacing them makes the app social and lets you
  text a build idea to a buddy.
- **Effort:** small.

### 3F. Offline caching of AI ideas + "saved builds"  ★ optional
- Let the offline "Surprise me" keep a short history, and let you bookmark projects to a
  "Saved" list (localStorage). 
- **Effort:** small.

---

## What I recommend for Phase 3 (my pick, tell me if you disagree)

Do **3A + 3B first** — they directly serve your "teach me by doing" goal and remove the
biggest friction we just added. Then **3D** (CYD mode) because it's your hardware. 3C/3E/3F
are polish we can slot in after those three land.

**Proposed order:** 3B (quick win, unblocks easy custom parts) → 3A (the code payoff) →
3D (CYD). Each gets its own test file + a commit, same verify-before-push discipline.

---

## Open questions for you

1. **Code language:** Arduino (C++) for ESP32, or also CircuitPython? Most catalog projects
   are ESP32-centric, so Arduino first is the natural call.
2. **How many projects get code in 3A:** all 30+, or just the beginner + intermediate set
   to start? (I lean: beginner + intermediate now, advanced later.)
3. **CYD mode (3D):** confirm you want it as a toggle vs. just better CYD annotations.
4. Anything from your *real* parts bin you'd like modeled as a custom part example in the
   docs? (Helps me write the 3B guided creator around real cases.)

---
*Once you approve this plan (or trim it), I'll commit Phase 2 to GitHub, push, verify live,
then start Phase 3 with 3B.*
