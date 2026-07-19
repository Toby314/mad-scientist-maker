# Mad Scientist Maker ⚗

> Build it with what you've got. An offline-first web app that recommends
> electronics projects from the parts you already own — and teaches you the WHY
> behind every one.

No build step. No framework. No backend. No accounts. Just open it.

---

## What it does

1. **Inventory** — tick the parts you own from a grouped checklist
   (microcontrollers, sensors, displays, power, I/O, passives, audio, motors,
   radio, misc). Wiring basics (breadboard, jumper wires, USB cable, hookup wire)
   are assumed — you don't tick those. Add your own parts with the
   **guided custom-part creator** (no token memorizing — see below).
2. **Projects** — the app matches your parts against a curated catalog and shows:
   - **✅ Buildable Now** — projects you can build right now, ranked by fit, each
     with a *what you'll learn* blurb, the exact parts it uses from *your*
     inventory, a high-level wiring outline, and a "level-up" note.
   - **🔬 Could've Been** — 2–4 near-misses you're only **1–2 parts away** from,
     with the exact missing part(s) named in a red box.
   - **🟡 CYD focus** — turn on *Optimize for CYD* (⚙️ Settings, **on by default**)
     and screen-based builds (the Cheap Yellow Display / ESP32 + TFT) are ranked
     first and stamped with a 🟡 CYD badge, with a live panel of your ready
     screen-builds.
3. **🛒 Shopping List** — every missing part from the near-misses, deduplicated
   and sorted by **how many extra projects it unlocks** (buy the top one first
   for the best leverage). Copy or export it.
4. **Project detail** — tap any buildable/near-miss card to open a page with a
   **full, copy-paste Arduino/C++ sketch** (ESP32-S3 targeted) + a Copy button,
   plus the wiring outline and parts used. 33 curated projects ship with a
   verified sketch.
5. **⚙️ Settings** — light/dark theme, **Optimize for CYD** toggle, optional AI
   suggestions, and data export.

---

## How to run it

### Option A — double-click (simplest, file://)
Open `index.html` in your browser. The app runs fully.
*Caveat:* because browsers block `fetch()` of local files, the catalog is
embedded as JavaScript (not a fetched `.json`) so this works. PWA install
(Add to Home Screen) only works over http(s), not from a `file://` page — see
Option B.

### Option B — served over http (recommended; enables PWA + offline)
From this folder:

```bash
python3 -m http.server 8123
```

Then visit **http://localhost:8123/** . Now you can:
- Add it to your phone/desktop home screen (PWA), and
- Use it fully offline after the first load (service worker caches everything).

Any static host works (GitHub Pages, Netlify, a Pi on your LAN, etc.) — just
upload the whole folder.

> To verify the engine without a browser, run `node engine.test.js` from this
> folder. It prints the real buildable / could've-been / shopping-list results
> for a sample inventory.

---

## How to add parts you own

Just use the **🧪 Inventory** tab — tick the checkboxes. Your choices are saved
automatically in the browser (localStorage). Use **Export JSON** to back up or
share your list, and **Import JSON** to restore it.

### Adding a part that isn't in the list
Open `js/taxonomy.js`. Each part is one line in the `PARTS` array:

```js
{ id: 'my_sensor', name: 'My Cool Sensor', cat: 'sensor',
  caps: ['sensor-temp'] },   // the capabilities it provides
```

- `id` — unique slug.
- `name` — what shows in the checklist.
- `cat` — one of the category ids in `CATEGORIES` (controls the section).
- `caps` — capability tokens (see the CAPABILITY list below). If your part
  provides a brand-new capability, also add a friendly line to
  `CAPABILITY_CANONICAL` so gap/shopping text reads well.

---

## Project status (phased build)

This app is built in spec-first phases. Current milestone:

| Phase | What it adds | Status |
|-------|--------------|--------|
| 1 — Core recommender | Inventory, catalog matching, buildable/near-miss, shopping list, learning paths | ✅ done |
| 2 — UI refinements | WHY/teaching blocks, difficulty + topic filters, guided detail, custom-part creator (token-free) | ✅ done |
| 3A — Sketch library | 33 Arduino/C++ sketches, **all compile-verified on ESP32-S3**, wired into detail view with Copy button | ✅ done |
| 3B — Custom parts | Guided capability checklist + preset (no token memorizing) | ✅ done |
| 3D — CYD first-class | "Optimize for CYD" toggle, re-rank screen builds, 🟡 badge, focus panel | ✅ done |
| 4 — iPhone/PWA polish | Install prompt, larger touch targets, offline proof | ✅ done (v4.0.0) |
| 5 — Gap-closing | "Why it fits" reasoning + teach-me, fuzzy/semantic search, datasheet→catalog import + graph, PCB/BOM assist, desktop/MCP packaging | 📋 planned |

**Phase 4 (current release, v4.0.0) ships:** 67 parts, 33 catalog projects, 33 verified
ESP32-S3 sketches, custom-part creator, CYD-first recommendations, and iPhone/PWA polish
(install prompt, 44px touch targets, responsive ≤480px, proven offline cache).

---

## How to add a catalog project

Open `js/catalog.js`. Copy any project block and edit it. The important part is
`requiredCaps` / `optionalCaps` — these are **capability tokens**, not part
names, so any board/part that provides them matches:

```js
{
  id: 'my_project',
  title: 'My Project',
  blurb: 'One-line description.',
  difficulty: 'Beginner',          // Beginner | Intermediate | Advanced
  buildTime: '~1 hour',
  requiredCaps: ['mcu', 'sensor-temp'],   // MUST have these to build
  optionalCaps: ['display-i2c-oled'],     // makes it better, not required
  concepts: ['I2C', 'analog read'],
  why: 'What you learn and why it matters.',
  steps: ['Wire X to Y.', 'Flash the example.', 'Watch it work.'],
  levelUp: 'Add Z to extend it.',
  coolness: 4, learning: 4,        // 1–5, used for ranking
  tags: ['sensors', 'display'],
}
```

That's it — no registration, no build step. Reload the page.

### The capability tokens (the matching vocabulary)
`mcu`, `mcu-wifi`, `mcu-ble`, `sensor-temp`, `sensor-humidity`, `sensor-pressure`,
`sensor-motion`, `sensor-moisture`, `sensor-distance`, `sensor-light`,
`sensor-gas`, `sensor-imu`, `sensor-current`, `display-i2c-oled`,
`display-spi-tft`, `display-eink`, `display-ledmatrix`, `display-lcd`, `rtc`,
`lora`, `rfid`, `rf-24ghz`, `rf-433`, `relay`, `buzzer`, `speaker`, `mic`,
`servo`, `stepper`, `dc-motor`, `motor-driver`, `button`, `switch`,
`potentiometer`, `rotary-encoder`, `led`, `led-addressable`, `resistor`,
`capacitor`, `battery`, `battery-18650`, `lipo`, `charge-tp4056`, `power-boost`,
`power-buck`, `storage-sd`, `i2c`, `spi`, `pwm`, `adc`, `touch`, `onewire`.

---

## Optional AI suggestions (graceful, offline-safe)

The curated catalog is the reliable, always-offline brain. AI is a **bonus**:

1. Open **⚙️ Settings → Optional AI Suggestions**.
2. Enter an OpenAI-compatible endpoint (default
   `https://api.openai.com/v1/chat/completions`), your API key, and a model.
3. The key is stored **only in your browser's localStorage** — never hardcoded,
   never sent anywhere except the endpoint you specify.
4. With a key saved, a **✨ Surprise me (AI)** button appears on the Projects tab
   that asks the LLM for fresh ideas from your inventory.

If no key is set, the app shows a gentle hint instead of the button and works
100% offline. The catalog engine is always the default.

---

## How the matching works (the WHY)

`js/engine.js` is the heart. For each project it compares `requiredCaps` against
the set of capabilities your owned parts provide:

- all required present → **Buildable Now**
- missing exactly 1–2 *and* you already have at least one required cap →
  **Could've Been** (near-miss)
- otherwise → ignored

Buildable projects get a transparent fitness score and are sorted by it. The
"1–2 parts away" rule plus the `CAPABILITY_CANONICAL` map is what turns a missing
token like `lora` into a real buy suggestion ("LoRa module (SX1278 + antenna)")
in both the near-miss cards and the shopping list.

---

## Project layout

```
mad-scientist-maker/
  index.html            app shell + tabs
  css/styles.css        dark "mad scientist lab" theme
  js/
    taxonomy.js         the parts checklist + capability vocabulary
    catalog.js          the project catalog (edit this to add projects)
    engine.js           pure matching logic (no DOM; testable in Node)
    inventory.js        localStorage + export/import
    ai.js               optional LLM layer (graceful)
    ui.js               renders results into the DOM
    app.js              state, events, PWA registration
  manifest.webmanifest  PWA manifest
  sw.js                 service worker (offline cache)
  icon-192.png / icon-512.png
  engine.test.js        Node proof of the matching engine
  make_icons.py         (optional) regenerates the icons
  README.md
```

---

## What I learned building this / what's in v2

**What it demonstrates (good first-app lessons):**
- Matching by *capability*, not exact SKU, is what makes a recommender flexible.
- Keeping pure logic (`engine.js`) separate from rendering (`ui.js`) makes it
  testable without a browser — that's why `node engine.test.js` can prove the
  math.
- A service worker + manifest is all a PWA needs; offline is just "cache the
  shell."
- Graceful degradation: the AI layer is fully optional, so the core never
  depends on a network or a key.

**Ideas shipped in later phases (were v2 ideas):**
- ✅ **Project detail pages** with full, copy-paste code + library install steps (Phase 3A).
- ✅ **Quantity counts** in inventory (e.g. "2× LEDs, 3× servos") so multi-instance
  projects can match (v2 quantity map).
- ✅ **"More like this"** per card (the AI `morelike:` mode is already wired).
- ✅ **Custom parts editor** in the UI (Phase 3B — guided checklist, no hand-editing).
- ✅ **Difficulty/interest filters** and a topic picker (Phase 2A).
- ✅ **Tag-based "what should I learn next?"** path through the catalog (Learning Paths tab).
- ✅ **CYD first-class mode** — ranked screen builds + 🟡 badge (Phase 3D).
- ✅ **iPhone/PWA polish** — install prompt, iOS Safari "Add to Home Screen"
  hint, 44px touch targets, responsive ≤480px, and a proven offline-cache check
  (every load-bearing asset is precached; app runs offline) — Phase 4, v4.0.0.

**Next up (Phase 5):** see [`plans/phase5.md`](plans/phase5.md) — close gaps the
competitive scan exposed (reasoning/teach-me, fuzzy search, datasheet import +
knowledge graph, PCB/BOM assist, desktop + MCP packaging).
