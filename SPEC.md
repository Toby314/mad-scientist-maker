# Mad Scientist Maker — SPEC (for sign-off)

> Spec-first build. No code yet. Read this, tell me to "build it" or "change X".
> Goal: an offline-first static PWA that recommends electronics projects from
> parts you own, and TEACHES you the WHY behind each one.

================================================================================
1. WHAT IT DOES (recap)
================================================================================
- You tick the parts you own (a curated checklist, grouped by category).
- The app matches your parts against a project catalog and shows:
    * BUILDABLE NOW  — projects you can build with what's on hand, ranked.
    * COULD'VE BEEN — 2–4 near-misses you're only 1–2 parts away from,
                      naming the EXACT missing part(s).
- A SMART SHOPPING LIST collects every missing part from the near-misses,
  deduplicated, sorted by how many extra projects each part unlocks
  (highest-leverage buy first).
- Optional AI mode (graceful): add a local-stored API key to unlock
  "surprise me" idea generation. App is 100% functional with NO key.
- Installable PWA: add to phone home screen, works offline at the bench.
- Inventory saved in browser localStorage; export/import as JSON.

================================================================================
2. KEY DESIGN DECISIONS (the WHY)
================================================================================
D1. PURE STATIC, NO BUILD STEP, NO FRAMEWORK.
    HTML + CSS + vanilla JS. Opens by double-clicking index.html OR served
    from any static host. Easiest thing for a beginner to own and edit.

D2. MATCH BY CAPABILITY, NOT EXACT PART.
    A "DHT22", an "BME280", and an "AHT10" all provide capability
    `sensor-temp` + `sensor-humidity`. A project only requires the
    CAPABILITY, so any of those satisfies it. This is the core trick that
    makes substitutions "just work" and keeps the catalog small.

D3. DATA EMBEDDED AS JS (not fetched JSON) SO file:// WORKS.
    You asked it to run by "opening index.html". Browsers BLOCK fetch() of
    local .json over file:// (CORS). So the catalog + taxonomy live in plain
    JS data files (heavily commented, easy to edit). Trade-off: the PWA
    service worker only registers when served over http(s) (localhost or a
    static host) — core app still works on file://, just not installable
    there. README documents both run modes.

D4. "BASICS" ARE ASSUMED OWNED (auto-added).
    breadboard, jumper wires, USB cable, hookup wire are always present so
    we never nag about them. LEDs/resistors are NOT assumed — you tick them
    (they're cheap but not universal).

================================================================================
3. FILE / FOLDER STRUCTURE
================================================================================
mad-scientist-maker/
  index.html              # app shell, tabs, mounts JS
  css/styles.css          # dark "mad scientist lab" theme, responsive
  js/
    taxonomy.js           # PARTS_TAXONOMY: every recognizable part + its capabilities
    catalog.js            # PROJECT_CATALOG: 28–30 seed projects (the JSON-in-JS)
    engine.js             # PURE matching logic (no DOM) — testable in Node
    inventory.js          # localStorage CRUD + export/import JSON
    ui.js                 # renders tabs, cards, lists
    ai.js                 # optional LLM call (graceful, key in localStorage)
    app.js                # wires everything, registers service worker
  manifest.webmanifest    # PWA manifest (name, icons, theme)
  sw.js                   # service worker (app-shell cache, offline)
  icon-192.png / icon-512.png   # generated app icons (Python/PIL)
  README.md               # how to run, add parts, add projects, enable AI
  SPEC.md                 # this file

================================================================================
4. DATA MODEL
================================================================================

--- 4a. CAPABILITY TAXONOMY (flat tokens) --------------------------------
A small, stable vocabulary. Projects require capabilities; parts provide them.

  mcu                  any programmable microcontroller
  mcu-wifi             MCU with WiFi (ESP32, ESP8266, Pi Pico W, Pi 3/4/5)
  mcu-ble              MCU with Bluetooth LE (ESP32, Pico W, Pi 4/5)
  sensor-temp          temperature sensor
  sensor-humidity      humidity sensor
  sensor-motion        PIR / motion
  sensor-moisture      soil / moisture
  sensor-distance      ultrasonic distance
  sensor-light         LDR / photoresistor / ambient light
  sensor-gas           MQ-2 etc smoke/gas
  display-i2c-oled     any I2C OLED (SSD1306)
  display-spi-tft      TFT screen (incl. CYD)
  display-eink         e-ink panel
  display-ledmatrix    LED matrix
  rtc                  real-time clock module
  lora                 LoRa radio module
  rfid                 RFID/NFC reader
  relay                relay module
  buzzer               piezo / active buzzer
  speaker              speaker (needs tone/DAC)
  mic                  microphone module
  servo                servo motor
  stepper              stepper motor
  dc-motor             DC motor
  motor-driver         driver board (L298N/ULN2003/A4988)
  button               pushbutton
  switch               toggle/slide switch
  potentiometer        pot
  rotary-encoder       rotary encoder
  led                  LED
  battery              battery pack (generic)
  battery-18650        18650 cell
  lipo                 LiPo cell
  charge-tp4056        TP4056 charge module
  power-boost          boost converter (e.g. for 5V from LiPo)
  power-buck           buck converter

--- 4b. PARTS TAXONOMY (the checklist) ------------------------------------
Each recognizable part maps to capabilities. Example entries:

  # --- MCU / dev boards (the full common lineup) ---
  { id:"esp32",   name:"ESP32 Dev Board",        cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","i2c","spi","pwm","adc","touch"] }
  { id:"esp8266", name:"ESP8266 (e.g. NodeMCU)", cat:"mcu",
    caps:["mcu","mcu-wifi","i2c","spi","pwm","adc"] }
  { id:"uno",     name:"Arduino Uno",            cat:"mcu",
    caps:["mcu","i2c","spi","pwm","adc"] }
  { id:"nano",    name:"Arduino Nano",           cat:"mcu",
    caps:["mcu","i2c","spi","pwm","adc"] }
  { id:"rpi3_4_5",name:"Raspberry Pi 3/4/5",     cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","i2c","spi","pwm"] }
  { id:"pico",    name:"Raspberry Pi Pico",      cat:"mcu",
    caps:["mcu","i2c","spi","pwm","adc"] }            # no wireless
  { id:"pico_w",  name:"Raspberry Pi Pico W",    cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","i2c","spi","pwm","adc"] }
  { id:"pico2w",  name:"Raspberry Pi Pico 2 W",  cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","i2c","spi","pwm","adc"] }
  { id:"zero",    name:"Raspberry Pi Zero",      cat:"mcu",
    caps:["mcu","i2c","spi","pwm"] }                  # headless Linux, no wireless
  { id:"zero2w",  name:"Raspberry Pi Zero 2 W",  cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","i2c","spi","pwm"] }
  { id:"dht22",   name:"DHT22 (temp+humidity)",  cat:"sensor",
    caps:["sensor-temp","sensor-humidity"] }
  { id:"ssd1306", name:"SSD1306 OLED 128x64",    cat:"display",
    caps:["display-i2c-oled","i2c"] }
  { id:"cyd",     name:"CYD (ESP32 + TFT touch)",cat:"mcu",
    caps:["mcu","mcu-wifi","mcu-ble","display-spi-tft","i2c","spi","pwm","adc","touch"] }
  ... (all boards/sensors/displays/power/I-O/passives/audio/motors/RF you listed)

The UI renders this grouped by `cat` as checkboxes. Tick = you own it.

--- 4c. INVENTORY (what you own) -----------------------------------------
Stored in localStorage as:
  { version:1, ownedIds:["esp32","dht22","ssd1306","pir","relay","led","buzzer",...] }
Plus an optional custom list for parts not in the taxonomy:
  custom:[{name:"Weird Sensor X", caps:["sensor-temp"]}]   (advanced; documented)

--- 4d. PROJECT CATALOG SCHEMA (one project) -----------------------------
  {
    id: "weather_station",
    title: "Mini Weather Station",
    blurb: "Reads temperature + humidity and shows them on a screen.",
    difficulty: "Beginner",          // Beginner | Intermediate | Advanced
    buildTime: "~1 hour",
    requiredCaps: ["mcu","sensor-temp","sensor-humidity"],
    optionalCaps: ["display-i2c-oled","wifi","rtc"],
    concepts: ["I2C","reading digital sensors","Serial Monitor"],
    why: "Teaches how a digital sensor talks over a bus (I2C) and how to turn
          raw numbers into something useful on a screen.",
    steps: [
      "Wire DHT22 data pin to a GPIO with a 10k pull-up resistor.",
      "If you have an OLED, connect it over I2C (SDA/SCL).",
      "Flash the example, open Serial Monitor, watch the readings.",
      "Render temp/humidity on the OLED instead of Serial."
    ],
    levelUp: "Add an RTC + deep sleep so it logs every 10 min on battery.",
    coolness: 4,        // 1–5 (for ranking)
    learning: 4,       // 1–5 (for ranking)
    tags: ["sensors","display"]
  }

================================================================================
5. MATCHING ALGINE (the heart) — pseudocode in engine.js
================================================================================
Inputs: inventoryCaps = union of caps of all owned parts + baseline basics.
        (baseline = breadboard, jumper wires, usb cable, hookup wire)

For each project P:
  have        = inventoryCaps
  reqMissing  = P.requiredCaps  minus have
  optHave     = P.optionalCaps  intersect have
  if reqMissing is empty:
        -> BUILDABLE.  usedParts = map each required/optional cap -> an owned
           item that provides it.  score = fitness(P, optHave).
  else if len(reqMissing) in {1,2}:
        -> COULD'VE BEEN.  gap = for each missing cap, look up its
           CANONICAL PART (see 6) and show that exact part name.
  else:
        -> too far, skip.

FITNESS SCORE (transparent, you can tweak weights in one place):
  score = optHave.length*2 + coolness + learning - difficultyPenalty
  difficultyPenalty: Beginner 0, Intermediate 1, Advanced 2
  (Favors projects that use more of your optional gear, are cooler/more
   educational, and (slightly) easier — good for a new maker.)
  Buildable list sorted by score desc. (Ties broken by difficulty asc.)

--- WORKED EXAMPLE (real numbers) ----------------------------------------
Sample inventory:  esp32, dht22, ssd1306, pir, relay, led, buzzer

  Weather Station   req[mcu,sensor-temp,sensor-humidity] -> all HAVE
                    opt[display-i2c-oled] HAVE -> BUILDABLE, score=2+4+4-0=10
  Motion Light      req[mcu,sensor-motion,relay] -> all HAVE -> BUILDABLE
  WiFi NTP Clock    req[mcu-wifi,rtc,display-i2c-oled] -> rtc MISSING(1)
                    -> COULD'VE BEEN (missing: "RTC module, e.g. DS3231")
  LoRa Messenger    req[mcu,lora] -> lora MISSING(1) -> COULD'VE BEEN
  RFID Door Lock    req[mcu,rfid,relay] -> rfid MISSING(1) -> COULD'VE BEEN

  SHOPPING LIST (from the 3 near-misses):
    RTC module (DS3231)   — unlocks 1 project (WiFi NTP Clock)
    LoRa module (SX1278)  — unlocks 1 project (LoRa Messenger)
    RFID reader (RC522)   — unlocks 1 project (RFID Door Lock)
  (sorted by unlocks; ties keep catalog order. As you add more near-misses
   that share a part, that part rises to the top — that's the leverage idea.)

================================================================================
6. CAPABILITY -> CANONICAL PART MAP (for gaps + shopping list)
================================================================================
A small lookup so "missing lora" becomes a real buyable suggestion:
  sensor-temp/humidity -> "DHT22 (temp+humidity)"
  display-i2c-oled     -> "SSD1306 OLED 128x64 (I2C)"
  rtc                  -> "RTC module (DS3231)"
  lora                 -> "LoRa module (SX1278 + antenna)"
  rfid                 -> "RFID reader (RC522)"
  mcu-wifi             -> "ESP32 Dev Board"
  display-spi-tft      -> "TFT display (ILI9341) or a CYD"
  servo/stepper/...    -> its standard module
This map is ONE editable object in engine.js — easy to keep current.

================================================================================
7. SMART SHOPPING LIST ALGORITHM
================================================================================
1. Collect every reqMissing cap across all COULD'VE BEEN projects.
2. Map each to its canonical part.
3. Dedupe by canonical part; for each, count how many near-miss projects it
   would complete, and remember which projects.
4. Sort by count desc (highest leverage first), then by project difficulty.
5. Render rows: "Part name — unlocks N projects (Project A, Project B)".
6. Copy-to-clipboard + Export .json/.txt buttons.

================================================================================
8. OPTIONAL AI LAYER (graceful, offline-safe)
================================================================================
- Settings tab has an "AI Suggestions" panel: endpoint URL, API key
  (password field), model name. All saved in localStorage ONLY.
- If no key: the "Surprise me" / "More like this" buttons are hidden with a
  small "add a key in Settings to unlock AI" note. Core never breaks.
- If key present: button appears. On click, ai.js builds a prompt from your
  inventory caps + a mode ("surprise" | "more like <project>") and calls a
  chat-completions endpoint via fetch (OpenAI-compatible). Response rendered
  as extra idea cards (clearly labelled "AI-generated, unverified").
- Default endpoint placeholder: https://api.openai.com/v1/chat/completions
  (you can point it at any OpenAI-compatible/local LLM). No key hardcoded.

================================================================================
9. PWA
================================================================================
- manifest.webmanifest: name "Mad Scientist Maker", short_name "MSM",
  display "standalone", theme/background dark (#0b0e14 / #121722),
  icons 192 + 512 (generated PNG).
- sw.js: on install, cache the app shell (index.html, css, all js, icons,
  manifest). Cache-first for shell, network fallback. Works offline after
  first load.
- app.js registers the SW only when served over http(s) (not file://).
- Icons generated with Python/PIL (no external dependency if Pillow present;
  if not, I'll rasterize the SVG fallback). Verified installable via
  browser devtools + a screenshot.

================================================================================
10. SCREEN LAYOUT (single page, tabbed)
================================================================================
HEADER: "⚗ Mad Scientist Maker" + tagline "Build it with what you've got."
TABS:  [ Inventory ] [ Projects ] [ Shopping List ] [ Settings ]

INVENTORY tab:
  - Grouped checklists (MCU / Sensors / Displays / Power / I-O / Passives /
    Audio / Motors / Connectivity / Misc). Live "X parts owned" count.
  - "Load sample inventory" (demo), "Clear", Export JSON, Import JSON.
  - Changing inventory instantly recomputes Projects + Shopping List.

PROJECTS tab:
  - Section "✅ Buildable Now (N)" — cards sorted by fit:
      Title + blurb | difficulty badge + time
      WHY blurb (concept taught)
      concept chips  |  "Uses your: <part> <part> ..." chips
      steps (numbered)  |  level-up note
  - Section "🔬 Could've Been (1–2 parts away)" — 2–4 cards:
      Title + blurb | missing part(s) shown in a red "You're missing: X"
      box with an "Add to shopping list" button.
  - Friendly empty states ("Tick some parts to get suggestions!").

SHOPPING LIST tab:
  - Deduplicated list, sorted by leverage. Each row: part, "unlocks N",
    source projects. Copy + Export buttons.

SETTINGS tab:
  - Theme (dark default; light toggle). 
  - AI panel (endpoint/key/model; Test button; graceful hidden when empty).
  - Data: Export / Import / Reset inventory.

================================================================================
11. SEED CATALOG COVERAGE (target ~28–30 projects)
================================================================================
BEGINNER (≈12): Blink+Button (GPIO), PWM LED Dimmer, Motion Light, Mini
Weather Station, Plant Moisture Monitor, Doorbell (button+buzzer), Distance
Ranger (ultrasonic), Light Nightlight, OLED Hello-World, Buzzer Melody
(tone), Servo Sweep, Potentiometer ADC Read.

INTERMEDIATE (≈14): WiFi NTP Clock, WiFi Weather Dashboard, Plant Monitor+
Display, RFID Door Lock, Retro Snake Game (OLED), TFT Touch Dashboard,
Battery Sensor Node (deep sleep), LoRa Messenger, BLE Temp Notifier,
Stepper Controller, DC Motor PWM, Rotary Menu (OLED), Gas/Smoke Alarm,
LED Matrix Scroller, Smart Relay Timer, E-ink Frame.

ADVANCED (≈3–4): Multi-sensor Weather + LoRa Remote, BLE Game Controller,
Security System (motion+RFID+buzzer).
(Catalog is just an array — you add more by editing catalog.js. README shows
the exact edit.)

================================================================================
12. BUILD PLAN (small, verifiable steps)
================================================================================
1. Scaffold folders + index.html shell + dark CSS theme.  [verify: page loads]
2. taxonomy.js + catalog.js (data only).                 [verify: data loads]
3. engine.js matching (pure). Write engine.test.js Node script that runs the
   worked example and PRINTS buildable/could've-been/shopping list.
                                                         [verify: real output]
4. inventory.js (localStorage + export/import).
5. ui.js: Inventory tab + Projects tab rendering.
6. Shopping list tab.
7. ai.js optional layer + Settings tab.
8. PWA: manifest + sw.js + icons. Register SW in app.js.
9. Final browser verification with screenshots (buildable, could've-been,
   shopping list, PWA install prompt, offline reload).
10. README + v2 notes.

================================================================================
13. VERIFICATION (evidence, not claims)
================================================================================
- Node test (step 3) prints actual matching results for the sample inventory
  above — you'll see the same numbers as section 5.
- Browser (served via `python3 -m http.server`): I'll load it, click
  "Load sample inventory", screenshot the Buildable + Could've-Been sections,
  the Shopping List (sorted), the PWA install prompt, and an offline reload
  (devtools offline) to prove caching. Screenshots shown to you.

================================================================================
14. DECISIONS I'D LIKE YOU TO CONFIRM (or change)
================================================================================
A) Embed data as JS (not fetched JSON) so file:// works — OK? (D3)
B) Fitness score weighting (optHave*2 + coolness + learning - difficulty) —
   good starting point for a beginner? Easy to change later.
C) Auto-assume wiring basics (breadboard/wires/USB) but NOT LEDs/resistors —
   agree?
D) ~28–30 seed projects, board-inclusive. Every project requires CAPABILITIES
   (not a specific board), so each auto-fits whichever you own: ESP32,
   ESP8266, Arduino Uno/Nano, Raspberry Pi 3/4/5, Pi Pico, Pi Pico W,
   Pi Pico 2 W, Pi Zero, Pi Zero 2 W, and the CYD. The catalog varies
   requirements so it spans the whole lineup (some need only "mcu", some
   "mcu-wifi", some lean on the CYD's screen+touch). Beginner set stays
   board-agnostic where possible so a bare Arduino Nano or Pi Pico still wins.
E) AI default endpoint OpenAI-compatible chat completions — fine?
