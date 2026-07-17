# Mad Scientist Maker — /goal Prompt

> Paste everything below the line into a single Telegram message, prefixed with `/goal `.
> The first response back will be a SPEC for your sign-off (spec-first) — not code yet.

---

/goal Build "Mad Scientist Maker" — an offline-first web app that recommends electronics projects from the parts a maker already owns.

**Who it's for:** New makers (I'm one — I'm a firefighter learning ESP32/soldering, and I want this to teach me and others). It must be a *learning tool*, not just a picker. Every suggestion should teach the WHY.

**Core user flow:**
1. The maker builds an **inventory** of parts they own, across categories: microcontrollers/dev boards (ESP32, ESP8266, Arduino Uno/Nano, Raspberry Pi Pico/Pico W, Pi Zero/Zero W, Raspberry Pi 3/4/5), sensors & modules, displays (OLED, TFT, LCD, e-ink, LED matrix, CYD), power (batteries, 18650s, LiPo, TP4056/charge modules, buck/boost converters), I/O (switches, relays, buttons, potentiometers, rotary encoders), passives (resistors, capacitors, LEDs), audio (buzzers, speakers, mics), motors/actuators (servos, steppers, DC motors, drivers), connectivity (RF, LoRa, RFID/NFC), and misc.
2. **Assume the maker already has the basics** — breadboards, perfboard, jumper wires, USB cables, basic hookup wire — so don't require or list those.
3. The app **suggests concrete projects** the maker can build *right now* with parts on hand, ranked by how well they fit (difficulty, coolness, learning value).
4. **BONUS "Could've Been" feature:** near the bottom of the results, show 2–4 *near-miss* projects the maker is only **1–2 parts away** from building — clearly naming exactly which missing part(s) would unlock each one.

**What each project suggestion must include (this is the teaching layer):**
- Title + a one-line "what it does"
- Difficulty (Beginner / Intermediate / Advanced) and rough build time
- The exact parts from *their* inventory it uses
- A short **WHY this works / what you'll learn** blurb (the concept it teaches — e.g. "teaches I2C," "teaches PWM," "teaches deep-sleep power saving")
- A high-level wiring/step outline (not full code, but enough to start)
- A "level-up" note: one way to extend the project once it works

**The matching engine (the heart of the app):**
- Maintain a **structured project catalog** (JSON) where each project declares `requiredParts`, `optionalParts`, `concepts/skills taught`, `difficulty`, and `tags`.
- Match by **capability, not exact SKU** — e.g. "any I2C OLED" satisfies a display requirement; "any ESP32 or Pi Pico W" satisfies a WiFi-MCU requirement. Use a component→capability taxonomy so substitutions work.
- "Buildable now" = all required capabilities satisfied by inventory. "Could've been" = missing exactly 1–2 required parts; compute and display the specific gap.
- Seed the catalog with **20–40 real, tested-concept beginner→intermediate projects** spanning the common parts above (weather station, WiFi clock, plant moisture monitor, motion-activated light, RFID door lock, retro game on a display, LoRa messenger, battery-powered sensor node, etc.). Make the catalog easily extensible so I can add more later.

**Bonus features (in addition to the core):**
- **Optional AI suggestions (graceful add-on):** Beyond the curated catalog, add an optional mode that calls an LLM to generate fresh/custom project ideas from the maker's inventory (e.g. "surprise me" or "more ideas like this"). It must be **fully optional and degrade gracefully** — the app works 100% offline with no key; if the maker adds an API key (stored locally, never hardcoded), the AI layer unlocks as a bonus. Keep the curated engine as the reliable default.
- **Smart shopping list:** Collect every missing part from all the "Could've Been" near-misses into a single **deduplicated shopping list**, sorted by **how many additional projects each part would unlock** (highest-leverage part first), so the maker knows the best next purchase. Let them export/copy this list.

**Architecture & tech (keep it beginner-buildable and offline-first):**
- Pure **static web app**: HTML + CSS + vanilla JavaScript (no build step, no framework, no backend, no accounts). Must run by opening index.html or from any static host.
- Make it an **installable PWA** (web app manifest + service worker) so I can add it to my phone's home screen and use it fully offline at my workbench. Include an app icon.
- **Inventory persists locally** in the browser (localStorage), with **Export/Import to a JSON file** so I can back up or share my parts list.
- Clean, responsive, **dark "mad scientist lab" themed** UI that works on phone and desktop.
- Fully **offline** after first load (service worker caches assets). No external API required for core functionality; the AI layer is the only online-optional piece.
- Well-commented code throughout — this is a learning project, so teach me in the comments *why* the code is structured the way it is.

**Process I want you to follow (spec-first, evidence-over-claims — my standing rule):**
1. **Brainstorm a short written spec first and get my sign-off before writing code** — data model for parts & projects, the capability taxonomy, screen layout, the matching algorithm, and how the AI/shopping-list/PWA pieces fit in. Show me examples.
2. Plan the build in small, verifiable steps.
3. Build it, then **actually run/verify it** — open it, add a sample inventory, and show me real screenshots/output proving "buildable now," "could've been," the shopping list, and PWA installability all work. Don't tell me it works; show me.
4. Explain the key decisions as you go (teach the WHY), and note where I'd extend it next.

**Deliverables:** the working app (index.html + JS + CSS + project-catalog JSON + PWA manifest/service worker/icon), a short README explaining how to run it, add parts, add catalog projects, and (optionally) enable AI, plus a brief "what you learned / what to build into v2" note at the end.
