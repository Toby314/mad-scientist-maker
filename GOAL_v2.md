# Mad Scientist Maker — /goal Prompt (v2 DRAFT — for sign-off)

> This is the v2 spec prompt. It extends the shipped v1 (GOAL.md) rather than replacing it.
> Once Toby signs off (or edits), paste the prompt section below as `/goal ` to start the build.
> Spec-first: the first response should be a SHORT SPEC for sign-off, not code.

---

## v1 recap (what shipped, so v2 extends it cleanly)

v1 is live at https://toby314.github.io/mad-scientist-maker/ (PWA, offline). Data model in force today:

- **Inventory (localStorage `msm.inventory.v1`):** `{ version:1, ownedIds:[...], custom:[{name, caps:[]}] }`
  - `ownedIds` is a **set** (owned = boolean, no quantity).
  - `custom` parts ARE already fed into matching via `engine.computeInventoryCaps` + `findOwnedPartForCap`. There is **no UI** to add them — you currently edit the inventory JSON by hand.
- **Project (`catalog.js`):** `{ id, title, blurb, difficulty, buildTime, requiredCaps:[], optionalCaps:[], concepts:[], why, steps:[], levelUp, coolness, learning, tags:[] }`
  - `steps` is a **high-level outline only** (no copy-paste code, no pin map).
  - Adding/removing a project requires hand-editing `catalog.js`.
- **Engine (`engine.js`):** matches by capability. `buildable` = all `requiredCaps` present. `near` ("Could've Been") = `1 ≤ missing ≤ 2` required caps AND ≥1 present. `far` = 3+ missing. Shopping list derived from near-miss gaps, sorted by leverage.
- **AI (`ai.js`):** `AI.suggest(capNames, mode)` where `mode` ∈ `surprise` | `morelike:<title>`. Fully optional; degrades gracefully with no key.

v2 keeps this engine and data model; it **adds fields and UI**, and makes **two** model changes (quantity-aware inventory; richer per-project fields). It never breaks offline use.

---

## v2 feature set (mapped from Toby's list, each with WHY)

1. **Project detail pages — full copy-paste code + library install steps**
   - WHY: v1 only teaches the *concept*; a new maker still has to go find code. A detail page that hands you the exact sketch + the one `pio lib install` line closes the "I get it but I can't build it" gap.
   - New project fields: `code: [{ file, lang, source }]` (embedded as JS strings so it still works on `file://` and offline — same rationale as taxonomy being JS not JSON), `install: [string]` (library install commands / Library-Manager steps).
   - Navigation: **hash route** `#/project/<id>` (shareable URL, back-button works, no server needed). Rendered by a new `detail.js` view.

2. **Quantity counts in inventory ("2× LEDs, 3× servos")**
   - WHY: the single genuinely invasive change. Today inventory is boolean, so "I have 1 LED" and "I have 20 LEDs" look identical, and a project needing 3 LEDs can't be told apart from one needing 1. Quantity lets multi-instance projects match correctly AND lets the shopping list say "buy 2 more," not just "buy some."
   - Model change: `owned` becomes a qty map `{ "<partId>": <qty> }`; `custom` items get a `qty` too. Projects may declare `qty: { "<cap>": N }` (default 1). `matchProject` treats a cap as satisfied only if `capQty[cap] >= qtyNeeded`. Qty-shortfall is reported as a missing reason (feeds Could've-Been + shopping list).

3. **"More like this" per card**
   - WHY: discovery, not just matching. Two engines:
     - **Offline (default, no key):** rank other projects by tag + `requiredCaps` overlap with the current one; show top 3.
     - **AI (bonus, key present):** reuse existing `morelike:<title>` mode via the per-card button.
   - UI: a "More like this" button on every result card.

4. **Custom parts editor in the UI**
   - WHY: the data path already exists (`inventory.custom`); only the UI is missing. Adds an "Add custom part" form (name + capability checkboxes drawn from the taxonomy) so you never hand-edit JSON. (Adding a brand-new *capability type* still means editing `taxonomy.js` — out of scope for v2 unless you want it.)

5. **Difficulty / interest filters + "Surprise me (curated)"**
   - WHY: as the catalog grows, raw lists overwhelm. Filters (Beginner/Intermediate/Advanced, tag/interest chips, "buildable now only") make the app usable at scale.
   - "Surprise me (curated)": pick a random result weighted by `coolness`+`learning` — **deterministic, offline**. Distinct from AI "Surprise me."

6. **Share a project to the catalog via JSON snippet import**
   - WHY: turns users into contributors and makes the catalog grow without code edits. Two-way: detail page has "Copy as JSON"; an "Import project" box validates a pasted project (must match the v2 project schema) and adds it to an in-memory catalog layer persisted in `localStorage` (`msm.catalog.user.v1`) so it survives reloads.

7. **Tag-based "What should I learn next?" path**
   - WHY: teaches *sequence*, not just isolation. Each project gets optional `prereqs: [projectId,...]`. A "Learning Path" view starts from a chosen project and walks forward along prereq edges, suggesting the next concept by tag. Lightweight v2 scope: prereq edges + tag similarity; no full DAG solver.

8. **Expand "Could've Been" from 1–2 to 1–3 missing parts**
   - WHY: the 1–2 window hides useful near-misses (e.g. a project needing a sensor + a display = 2 missing today counts; a 3-missing one is invisible). Bumping to 3 surfaces more "one shopping trip away" wins.
   - Change: `engine.js:111` threshold `reqMissing.length <= 2` → `<= 3`. Ranking already sorts closest-first. UI groups/sorts so 26 near-misses don't flood the screen (cap display or "show more").

9. **Clickable assembly instructions + pin wiring**
   - WHY: the #1 "I'm stuck" moment for a new maker is *which pin goes where*. v1's `steps` are prose.
   - New project field: `wiring: [{ part, signal, pin, note }]` → rendered as an auto-generated **pin table** (offline, teaches). Plus optional `guideUrl` for a deeper external write-up (the "clickable link"). Both shown on the detail page.

---

## Data-model delta (the only breaking changes)

**Inventory v1 → v2**
```
v1: { version:1, ownedIds:[...],                    custom:[{name, caps:[]}] }
v2: { version:2, owned:{ "<partId>": <qty> },        custom:[{name, caps:[], qty}] }
```
- Migration: on load, if `version:1`, convert `ownedIds` → `owned` map of `1`s.
- `computeInventoryCaps` becomes qty-aware (returns `capQty` map + present set).

**Project additions (non-breaking; absent fields = v1 behavior)**
```
+ code:    [{ file, lang, source }]   // embedded, offline
+ install: [string]                    // library install steps
+ wiring:  [{ part, signal, pin, note }]
+ guideUrl: string?                    // optional external deep-dive
+ qty:     { "<cap>": N }              // default 1
+ prereqs: [projectId]?                // for learning path
```

**Engine additions**
- `matchProject` enforces qty; reports `qtyShort: [{cap, have, need}]`.
- `analyze` near-threshold → `<= 3`.
- New `moreLike(project, catalog, k=3)` deterministic overlap scorer.
- New `learningPath(startId)` walker.

---

## Decisions (my recommended defaults — tell me to change any)

- **D1 Detail nav:** hash route `#/project/<id>` (shareable, offline, back-button). Alt: modal overlay.
- **D2 Code storage:** embedded in `catalog.js` as `code:[{file,lang,source}]` (keeps single-file offline model). Alt: one `.js` file per project.
- **D3 Wiring:** BOTH an in-app auto-generated pin table (primary, offline) AND optional `guideUrl` link. This directly satisfies "clickable link to instructions + pins."
- **D4 Quantity strictness:** qty is a **hard** buildable constraint (need ≥ required qty). Alt: soft (show shortage, but still call it buildable).
- **D5 Learning path:** lightweight prereq-edges + tag similarity (v2). Full DAG/topological sort deferred.

---

## Build order (small, verifiable steps — spec-first)

1. Bump inventory to v2 qty model + migration; prove old backups still load.
2. Engine: qty-aware matching + `qtyShort`; unit-test with a 3-LED project vs 1-LED inventory.
3. Engine: near-threshold → 3; add `moreLike()` + `learningPath()`; unit-test.
4. Project schema: add `code/install/wiring/guideUrl/qty/prereqs` to 2–3 seed projects as templates.
5. `detail.js` view (hash route) rendering code (copy button), install steps, wiring table, guide link.
6. UI: inventory qty steppers + custom-part editor form.
7. UI: difficulty/interest filters + "Surprise me (curated)" + per-card "More like this" (offline + AI).
8. UI: "Import project" JSON box + detail-page "Copy as JSON"; persist user catalog to localStorage.
9. UI: "Learning Path" view.
10. Re-run `engine.test.js` + `dom.test.js`; redeploy to Pages; screenshot proof.

## Verification plan (evidence over claims)

- `node engine.test.js` covers: qty matching, 1–3 near-miss, moreLike top-3, learningPath walk.
- `node dom.test.js` covers: detail page renders code + wiring table; filters change results; import adds a project.
- Live Pages URL re-verified HTTP 200 after deploy; one screenshot of a detail page with copy-paste code + pin table.

## Open questions for sign-off

- Q1: Confirm D1–D5 defaults, or pick alternatives.
- Q2: Scope — build ALL 9 now, or phase (e.g. 1–3, 8, 9 first as the "teaching core," then 4–7 as UX polish)?
- Q3: Seed projects needing qty (e.g. "LED Matrix Scroller" = many LEDs) — want me to add 2–3 multi-qty seed projects to exercise the new model?
