/* =============================================================================
 * engine.js  —  THE MATCHING ENGINE (pure logic, no DOM, runs in Node too)
 * -----------------------------------------------------------------------------
 * WHY THIS FILE IS SEPARATE FROM THE UI
 * The matching math is the valuable, testable part of the app. Keeping it free
 * of any browser/DOM dependency means we can run it under plain Node and PRINT
 * the results — proof it works WITHOUT needing a browser. (See engine.test.js.)
 * The UI just calls analyze() and renders what comes back.
 *
 * THE ALGORITHM (capability matching):
 *   For each project, compare its requiredCapabilities against the set of
 *   capabilities your owned parts provide.
 *     - all required present  -> BUILDABLE NOW
 *     - missing exactly 1 or 2  -> COULD'VE BEEN (a near-miss)
 *     - missing 3+             -> too far; ignored
 *   Buildable projects get a transparent FITNESS SCORE so we can rank them.
 *   Near-misses feed the Smart Shopping List (deduped, sorted by leverage).
 * ===========================================================================*/

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    // In Node we load the data files ourselves.
    const T = require('./taxonomy.js');
    const { PROJECT_CATALOG } = require('./catalog.js');
    module.exports = factory(T.PARTS, T.CAPABILITY_CANONICAL, PROJECT_CATALOG, T.CYD_RELEVANT_CAPS, T.CYD_CAP_WEIGHT, T.SEARCH_SYNONYMS);
  } else {
    // In the browser the data globals already exist (loaded before this file).
    root.Engine = factory(root.TAXONOMY.PARTS, root.TAXONOMY.CAPABILITY_CANONICAL, root.CATALOG.PROJECT_CATALOG,
                          root.TAXONOMY.CYD_RELEVANT_CAPS, root.TAXONOMY.CYD_CAP_WEIGHT, root.TAXONOMY.SEARCH_SYNONYMS);
  }
})(typeof self !== 'undefined' ? self : this, function (PARTS, CAPABILITY_CANONICAL, PROJECT_CATALOG, CYD_RELEVANT_CAPS, CYD_CAP_WEIGHT, SEARCH_SYNONYMS) {

  // ---------- small helpers ---------------------------------------------------
  const DIFF_PENALTY = { Beginner: 0, Intermediate: 1, Advanced: 2 };

  // Build a fast lookup: partId -> part object
  const PART_BY_ID = {};
  PARTS.forEach(p => { PART_BY_ID[p.id] = p; });

  // v2: max owned quantity available per capability.
  // capQty[cap] = largest quantity of that cap across all owned parts/customs.
  function computeCapQty(ownedIds, customParts) {
    const qty = {};
    (ownedIds || []).forEach(id => {
      const part = PART_BY_ID[id];
      if (!part) return;
      const n = INV_OWNED[id] || 1; // INV_OWNED set by analyze() pre-pass
      part.caps.forEach(c => { qty[c] = Math.max(qty[c] || 0, n); });
    });
    (customParts || []).forEach(p => {
      if (!p || !Array.isArray(p.caps)) return;
      const n = p.qty || 1;
      p.caps.forEach(c => { qty[c] = Math.max(qty[c] || 0, n); });
    });
    return qty;
  }

  // The SET of capabilities present at least once (for "have this cap at all?").
  function computeInventoryCaps(ownedIds, customParts) {
    const capQty = computeCapQty(ownedIds, customParts);
    return new Set(Object.keys(capQty).filter(c => capQty[c] >= 1));
  }

  /**
   * For a given capability, find the FIRST owned part that provides it.
   * Used to render the "Uses your: <part>" chips and to name the gap parts.
   * @returns {{id:string, name:string}|null}
   */
  function findOwnedPartForCap(cap, ownedIds, customParts) {
    for (const id of (ownedIds || [])) {
      const part = PART_BY_ID[id];
      if (part && part.caps.includes(cap)) return { id, name: part.name };
    }
    for (const p of (customParts || [])) {
      if (p.caps && p.caps.includes(cap)) return { id: 'custom:' + p.name, name: p.name };
    }
    return null;
  }

  // INV_OWNED is set by analyze() before matching: partId -> owned quantity.
  let INV_OWNED = {};

  /**
   * Match ONE project against the inventory capabilities, respecting quantities.
   * A required cap is satisfied only if ownedQty[cap] >= project.qty[cap] (default 1).
   * @returns {object} status + missing caps/qty + used part names + score
   */
  function matchProject(project, capQty, ownedIds, customParts) {
    const have = new Set(Object.keys(capQty).filter(c => capQty[c] >= 1));
    const reqMissing = [];   // caps missing entirely
    const qtyShort = [];      // caps present but not enough

    project.requiredCaps.forEach(c => {
      const need = (project.qty && project.qty[c]) || 1;
      const got = capQty[c] || 0;
      if (got <= 0) reqMissing.push(c);
      else if (got < need) qtyShort.push({ cap: c, have: got, need });
    });

    const optHave = project.optionalCaps.filter(c => have.has(c));

    const usedParts = {};
    project.requiredCaps.concat(project.optionalCaps).forEach(c => {
      if (have.has(c)) {
        const p = findOwnedPartForCap(c, ownedIds, customParts);
        if (p) usedParts[c] = p.name;
      }
    });

    if (reqMissing.length === 0 && qtyShort.length === 0) {
      // ---- BUILDABLE NOW -----------------------------------------------------
      const score =
        optHave.length * 2 +
        (project.coolness || 0) +
        (project.learning || 0) -
        (DIFF_PENALTY[project.difficulty] || 0);
      return { project, status: 'buildable', missing: [], qtyShort, optHave, usedParts, score };
    }

    const requiredPresent = project.requiredCaps.length - reqMissing.length - qtyShort.length;

    // v2: near-miss window widened to 1–3 missing (was 1–2). A missing part OR a
    // quantity shortfall both count as "gaps" for the Could've-Been / shopping list.
    const gapCount = reqMissing.length + qtyShort.length;
    if (gapCount >= 1 && gapCount <= 3 && requiredPresent >= 1) {
      const gap = reqMissing.map(c => ({
        cap: c,
        part: CAPABILITY_CANONICAL[c] || c,
        short: false,
      })).concat(qtyShort.map(s => ({
        cap: s.cap,
        part: (CAPABILITY_CANONICAL[s.cap] || s.cap) + ` (have ${s.have}, need ${s.need})`,
        short: true,
      })));
      // Preserve the original cap lists for the shopping list / engine internals.
      const allMissing = reqMissing.concat(qtyShort.map(s => s.cap));
      return { project, status: 'near', missing: allMissing, gap, qtyShort, usedParts, score: 0 };
    }

    // ---- too far (4+ gaps) ---------------------------------------------------
    const allMissing = reqMissing.concat(qtyShort.map(s => s.cap));
    return { project, status: 'far', missing: allMissing, gap: [], qtyShort, usedParts, score: 0 };
  }

  /**
   * Build the Smart Shopping List from the near-miss (could've-been) projects.
   * For each unique missing capability we compute:
   *   unlocks       = near-misses that become buildable if you buy ONLY this part
   *                   (i.e. that project was missing exactly this one cap)
   *   inNearMisses  = how many near-misses list this cap as missing (relevance)
   * Then sort by unlocks desc, then inNearMisses desc (highest leverage first).
   */
  function buildShoppingList(nearMatches) {
    const byCap = {}; // cap -> { cap, partName, unlocks, projects:Set, completeProjects:Set }
    nearMatches.forEach(m => {
      const p = m.project;
      m.missing.forEach(cap => {
        if (!byCap[cap]) {
          byCap[cap] = {
            cap,
            partName: CAPABILITY_CANONICAL[cap] || cap,
            unlocks: 0,
            projects: new Set(),
            completeProjects: new Set(), // projects this single part would finish
          };
        }
        byCap[cap].projects.add(p.title);
        // If this near-miss was missing ONLY this cap, buying it unlocks the project.
        if (m.missing.length === 1) byCap[cap].completeProjects.add(p.title);
      });
    });

    const list = Object.values(byCap).map(e => ({
      cap: e.cap,
      partName: e.partName,
      unlocks: e.completeProjects.size,
      inNearMisses: e.projects.size,
      projects: Array.from(e.projects),
    }));
    list.sort((a, b) => (b.unlocks - a.unlocks) || (b.inNearMisses - a.inNearMisses));
    return list;
  }

  /**
   * THE MAIN ENTRY POINT the UI calls.
   * @param {string[]} ownedIds   part ids the maker owns
   * @param {Array}    customParts optional user-typed parts
   * @returns {{buildable:Array, couldve:Array, shoppingList:Array}}
   */
  function analyze(ownedMap, customParts) {
    // v2: `ownedMap` is { partId: qty }. We derive the id list and a qty lookup
    // (INV_OWNED) so computeCapQty() can read per-part counts.
    const ownedIds = Object.keys(ownedMap || {});
    INV_OWNED = Object.assign({}, ownedMap || {});
    const capQty = computeCapQty(ownedIds, customParts);
    const buildable = [];
    const near = [];

    PROJECT_CATALOG.forEach(project => {
      const r = matchProject(project, capQty, ownedIds, customParts);
      if (r.status === 'buildable') buildable.push(r);
      else if (r.status === 'near') near.push(r);
    });

    // Rank buildable by fitness score desc; ties -> easier first (Beginner up).
    buildable.sort((a, b) =>
      (b.score - a.score) ||
      (DIFF_PENALTY[a.project.difficulty] - DIFF_PENALTY[b.project.difficulty]));

    // Rank near-misses: closer (1 missing) first, then by learning value.
    near.sort((a, b) =>
      (a.missing.length - b.missing.length) ||
      ((b.project.learning || 0) - (a.project.learning || 0)));

    return {
      buildable,
      couldve: near,
      shoppingList: buildShoppingList(near),
      inventoryCaps: Object.keys(capQty).filter(c => capQty[c] >= 1),
    };
  }

  /**
   * DETERMINISTIC "More like this" (offline, no key needed).
   * Scores every OTHER project by overlap with the given project, and returns
   * the top `k`. Signal = shared tags + shared required capabilities. This is
   * the offline twin of the AI `morelike:<title>` mode (which still works as a
   * bonus when a key is present).
   * @param {{id?:string}} project  the project to find siblings of
   * @param {number} k  how many to return (default 3)
   * @returns {Array<project>} top-k similar projects (excluding the seed)
   */
  function moreLike(project, k) {
    k = k || 3;
    const seedTags = new Set(project.tags || []);
    const seedCaps = new Set(project.requiredCaps || []);
    const scored = PROJECT_CATALOG
      .filter(p => p.id !== project.id)
      .map(p => {
        let score = 0;
        (p.tags || []).forEach(t => { if (seedTags.has(t)) score += 2; });
        (p.requiredCaps || []).forEach(c => { if (seedCaps.has(c)) score += 1; });
        return { p, score };
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map(x => x.p);
  }

  /**
   * PURE FILTER (Phase 2A) — applied to already-matched results for DISPLAY.
   * @param {Array} list  results (buildable or near) to filter
   * @param {{difficulties?:string[], tags?:string[]}} opts
   *   difficulties: keep only projects whose difficulty is in this set.
   *   tags:        keep only projects sharing >=1 of these tags.
   * @returns {Array} filtered (same element objects, order preserved)
   */
  function filterProjects(list, opts) {
    opts = opts || {};
    const diff = opts.difficulties || [];
    const tags = opts.tags || [];
    return list.filter(r => {
      const p = r.project;
      if (diff.length && !diff.includes(p.difficulty)) return false;
      if (tags.length && !(p.tags || []).some(t => tags.includes(t))) return false;
      return true;
    });
  }

  /**
   * LEARNING PATHS (Phase 2D) — a small teaching layer over the catalog.
   * Each path is a curated ordered sequence of project ids that build a skill
   * from zero. We resolve ids -> results so the card shows "buildable" status.
   * @param {Array} buildableIds  ids currently buildable (so we can mark done)
   * @returns {Array<{id,title,desc,steps:[{id,title,status}]}>}
   */
  function learningPaths(buildableIds) {
    const have = new Set(buildableIds || []);
    const byId = {};
    PROJECT_CATALOG.forEach(p => { byId[p.id] = p; });
    const PATHS = [
      { id: 'gpio', title: 'Blink to Buttons (GPIO basics)',
        desc: 'Learn that an MCU pin can be an output (LED) or an input (button), then combine them.',
        steps: ['blink_button', 'doorbell', 'motion_light'] },
      { id: 'analog', title: 'Analog In → Out',
        desc: 'Read a knob or sensor, then drive an output. The basis of every control project.',
        steps: ['pot_read', 'pwm_dimmer', 'nightlight', 'plant_monitor'] },
      { id: 'display', title: 'Tiny Screens',
        desc: 'Go from printing text to building a real UI on an OLED, then a color TFT / CYD.',
        steps: ['oled_hello', 'rotary_menu', 'tft_dashboard'] },
      { id: 'sensors', title: 'Sense the World',
        desc: 'Wire up sensors and turn raw numbers into something useful.',
        steps: ['weather_station', 'distance_ranger', 'gas_alarm'] },
      { id: 'wireless', title: 'Untether It',
        desc: 'Add WiFi, Bluetooth, or long-range radio so your gadget talks to the world.',
        steps: ['wifi_clock', 'ble_temp', 'lora_messenger'] },
      { id: 'motion', title: 'Make It Move',
        desc: 'Drive servos, steppers, and DC motors — the leap from "blink" to "robot".',
        steps: ['servo_sweep', 'stepper_controller', 'dc_motor_pwm'] },
    ];
    return PATHS.map(path => ({
      id: path.id, title: path.title, desc: path.desc,
      steps: path.steps
        .map(id => byId[id])
        .filter(Boolean)
        .map(p => ({ id: p.id, title: p.title, status: have.has(p.id) ? 'done' : 'todo' })),
    }));
  }

  /**
   * PHASE 3D — CYD (Cheap Yellow Display) relevance score.
   * Pure function over a project's required+optional caps. Used to re-rank
   * buildable projects when "Optimize for CYD" is on, so screen-based ESP32
   * builds (the CYD's whole reason to exist) float to the top.
   * Higher = more CYD-shaped. Caps not in CYD_RELEVANT_CAPS contribute 0.
   */
  function cydScore(project) {
    const caps = (project.requiredCaps || []).concat(project.optionalCaps || []);
    let score = 0;
    caps.forEach(c => {
      if (CYD_RELEVANT_CAPS.indexOf(c) === -1) return;
      score += (CYD_CAP_WEIGHT[c] || 1);
    });
    return score;
  }

  // Re-rank a buildable list by CYD relevance (desc), keeping the engine's
  // fitness order as the tiebreaker so non-CYD projects still sort sensibly.
  function sortByCyd(buildable) {
    return buildable.slice().sort((a, b) =>
      (cydScore(b.project) - cydScore(a.project)) ||
      (b.score - a.score) ||
      (DIFF_PENALTY[a.project.difficulty] - DIFF_PENALTY[b.project.difficulty]));
  }

  /**
   * PHASE 5 BLOCK 1 — "Why it fits" rationale (ponytail principle).
   * Pure, DOM-free, Node-testable. Turns an analyze() row into a structured
   * explanation the UI renders, so every recommendation justifies ITSELF.
   * @param {object} r  a row from analyze().buildable / analyze().couldve
   * @returns {{fit:string, uses:string[], skills:{level:string,time:string},
   *            missing:string[], cheapest:{cap:string,part:string}|null,
   *            whyNow:string}}
   */
  function rationale(r) {
    const p = r.project || {};
    const seen = new Set();
    const uses = [];
    Object.keys(r.usedParts || {}).forEach(cap => {
      const n = r.usedParts[cap];
      if (!seen.has(n)) { seen.add(n); uses.push(n); }
    });
    const missing = (r.gap || []).map(g => g.part);
    // A 1-gap near-miss has exactly one blocker -> name the single thing to buy.
    const cheapest = (r.missing && r.missing.length === 1)
      ? { cap: r.missing[0], part: CAPABILITY_CANONICAL[r.missing[0]] || r.missing[0] }
      : null;
    let fit, whyNow;
    if (r.status === 'buildable') {
      const extra = (r.optHave || []).length;
      fit = 'Buildable now — every required capability is already in your inventory.';
      whyNow = extra
        ? `Uses ${uses.length} part${uses.length === 1 ? '' : 's'} you own, plus ${extra} optional upgrade${extra === 1 ? '' : 's'} you can switch on anytime.`
        : 'Everything it needs is on your bench — no waiting, no new purchases.';
    } else {
      fit = `Almost there — ${r.missing.length} part${r.missing.length === 1 ? '' : 's'} short.`;
      whyNow = cheapest
        ? `Buy just the ${cheapest.part} and this jumps from "could've been" to buildable now.`
        : `Close ${r.missing.length} gaps (see the shopping list) and it's buildable.`;
    }
    return { fit, uses, skills: { level: p.difficulty, time: p.buildTime }, missing, cheapest, whyNow };
  }

  /**
   * PHASE 5 BLOCK 2 — Semantic & fuzzy search (offline, no key, no network).
   * Pure + Node-testable. Expands the user's words through SEARCH_SYNONYMS, then
   * scores PARTS and PROJECTS by token overlap. Exact vocabulary hits rank first;
   * synonym + fuzzy (Levenshtein <= 2) hits follow. Deterministic matching stays
   * the source of truth — this is an *augmentation* to help you FIND a part or
   * project when you don't know its exact taxonomy name.
   * @param {string} query  free text, e.g. "motion sensor", "screen", "temprature"
   * @returns {{parts:Array<{part,score,why}>, projects:Array<{project,score,why}>}}
   */
  function normalize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    const d = Array.from({ length: m + 1 }, (_, i) => [i].concat(new Array(n).fill(0)));
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  function search(query) {
    const q = normalize(query);
    if (!q) return { parts: [], projects: [] };
    const qTokens = q.split(' ');

    // Expand the query into (token -> weight) where 3 = exact vocab, 2 = synonym,
    // 1 = fuzzy. Synonyms pull in the taxonomy's own tokens; fuzzy catches typos.
    const terms = {}; // token -> best weight seen
    function add(tok, w) { terms[tok] = Math.max(terms[tok] || 0, w); }
    qTokens.forEach(tok => {
      add(tok, 3);
      if (SEARCH_SYNONYMS[tok]) SEARCH_SYNONYMS[tok].forEach(s => add(s, 2));
      // also try the synonym map in reverse (so "pir" expands to "motion sensor")
      // and fuzzy-match every known vocabulary token for this query token.
      Object.keys(SEARCH_SYNONYMS).forEach(key => {
        if (SEARCH_SYNONYMS[key].indexOf(tok) !== -1) add(key, 2);
        // fuzzy-match the synonym KEYS too (e.g. "temprature" -> "temperature")
        if (levenshtein(tok, key) <= 2 && tok.length >= 3) add(key, 2);
      });
      Object.keys(CAPABILITY_CANONICAL).concat(PARTS.map(p => p.id)).forEach(vocab => {
        if (levenshtein(tok, vocab) <= 2 && tok.length >= 3) add(vocab, 1);
      });
    });

    // ---- score PARTS ----
    // A part matches if any of its searchable text (id, name, caps) shares a term.
    const partHits = [];
    PARTS.forEach(part => {
      const hay = normalize([part.id, part.name, (part.caps || []).join(' '), (part.cat || '')].join(' '));
      let score = 0; const matched = [];
      Object.keys(terms).forEach(tok => {
        if (hay.indexOf(' ' + tok + ' ') !== -1 || hay === tok || hay.startsWith(tok + ' ') || hay.endsWith(' ' + tok)) {
          score += terms[tok]; matched.push(tok);
        }
      });
      if (score > 0) partHits.push({ part, score, why: matched.slice(0, 3).join(', ') });
    });
    partHits.sort((a, b) => b.score - a.score || a.part.name.localeCompare(b.part.name));

    // ---- score PROJECTS ----
    const projHits = [];
    PROJECT_CATALOG.forEach(p => {
      const hay = normalize([p.title, p.blurb, (p.tags || []).join(' '), (p.requiredCaps || []).join(' '),
        (p.optionalCaps || []).join(' '), (p.concepts || []).join(' ')].join(' '));
      let score = 0; const matched = [];
      Object.keys(terms).forEach(tok => {
        if (hay.indexOf(' ' + tok + ' ') !== -1 || hay === tok || hay.startsWith(tok + ' ') || hay.endsWith(' ' + tok)) {
          score += terms[tok]; matched.push(tok);
        }
      });
      if (score > 0) projHits.push({ project: p, score, why: matched.slice(0, 3).join(', ') });
    });
    projHits.sort((a, b) => b.score - a.score || (b.project.coolness || 0) - (a.project.coolness || 0));

    return { parts: partHits, projects: projHits };
  }

  /**
   * PHASE 5 BLOCK 3 — Datasheet / text -> capability import (offline).
   * Pure + Node-testable. Scans free text for component keywords and maps them to
   * the SAME capability tokens the engine matches on, so an imported part slots
   * straight into matching. No PDF parsing, no ML — a keyword->cap table covers
   * the "what does this board give me?" case for the parts makers actually own.
   * ponytail: keyword table only, no OCR/PDF; add pdf.js text-extraction if you
   * must import scanned datasheets.
   */
  // Keyword (lowercased substring) -> capability token(s). Kept small + explicit.
  const KEYWORD_CAPS = {
    wifi: ['mcu-wifi'], wireless: ['mcu-wifi'], 'wi-fi': ['mcu-wifi'],
    bluetooth: ['ble'], ble: ['ble'], 'low energy': ['ble'],
    buzzer: ['buzzer'], piezo: ['buzzer'], speaker: ['speaker'],
    led: ['led'], neopixel: ['led-addressable'], 'rgb led': ['led-addressable'], ws2812: ['led-addressable'],
    motor: ['dc-motor'], 'dc motor': ['dc-motor'],
    servo: ['servo'], stepper: ['stepper'],
    relay: ['relay'],
    screen: ['display-spi-tft', 'display-eink', 'display-i2c-oled', 'touch'],
    display: ['display-spi-tft', 'display-eink', 'display-i2c-oled'],
    oled: ['display-i2c-oled'], ssd1306: ['display-i2c-oled'],
    tft: ['display-spi-tft'], lcd: ['display-spi-tft'],
    eink: ['display-eink'], 'e-ink': ['display-eink'], epaper: ['display-eink'],
    touch: ['touch'],
    temperature: ['sensor-temp'], temp: ['sensor-temp'], dht: ['sensor-temp', 'sensor-humidity'],
    humidity: ['sensor-humidity'],
    motion: ['pir'], pir: ['pir'],
    distance: ['sensor-distance'], ultrasonic: ['sensor-distance'], 'hc-sr04': ['sensor-distance'],
    gas: ['sensor-gas'], smoke: ['sensor-gas'], mq: ['sensor-gas'],
    moisture: ['sensor-moisture'], soil: ['sensor-moisture'],
    rtc: ['rtc'], 'real-time': ['rtc'], clock: ['rtc'], ds3231: ['rtc'],
    sd: ['storage-sd'], 'sd card': ['storage-sd'], microsd: ['storage-sd'],
    camera: ['camera'], ov2640: ['camera'],
    imu: ['sensor-imu'], accelerometer: ['sensor-imu'], gyro: ['sensor-imu'], 'mpu': ['sensor-imu'],
    gy: ['sensor-imu'], '6-axis': ['sensor-imu'],
    analog: ['adc'], adc: ['adc'],
    i2c: ['i2c'], spi: ['spi'], pwm: ['pwm'],
  };

  function parseDatasheet(text, name) {
    const hay = normalize(text || '');
    const caps = [];
    Object.keys(KEYWORD_CAPS).forEach(kw => {
      if (hay.indexOf(kw) !== -1) KEYWORD_CAPS[kw].forEach(c => { if (caps.indexOf(c) === -1) caps.push(c); });
    });
    // only keep caps the engine actually knows (defensive against stale keywords)
    const valid = caps.filter(c => CAPABILITY_CANONICAL[c]);
    return { name: (name || '').trim(), caps: valid };
  }

  /**
   * PHASE 5 BLOCK 3 — part -> project knowledge graph (offline, no layout lib).
   * For a project, group the OTHER catalog projects by the capability they share
   * with it. This is the "what-else uses what I just learned?" adjacency list —
   * the useful 10% of a force-directed graph, rendered as plain lists.
   * @returns {Array<{cap, label, projects:Array<{id,title}>}>}
   */
  function partGraph(projectId) {
    const p = PROJECT_CATALOG.find(x => x.id === projectId);
    if (!p) return [];
    const caps = (p.requiredCaps || []).concat(p.optionalCaps || []);
    const out = [];
    caps.forEach(cap => {
      const shared = PROJECT_CATALOG.filter(x => x.id !== projectId &&
        ((x.requiredCaps || []).concat(x.optionalCaps || [])).indexOf(cap) !== -1);
      if (shared.length) out.push({ cap, label: CAPABILITY_CANONICAL[cap] || cap, projects: shared.map(x => ({ id: x.id, title: x.title })) });
    });
    return out;
  }

  /**
   * PHASE 5 BLOCK 4 — BOM / parts assist (offline, no PCB toolchain).
   * Turns a project's required+optional capability tokens into a concrete parts
   * list, deduplicated, with the user's inventory (Phase 3B) cross-checked so
   * each line shows have/need and how many they own. A wiring note is pulled
   * from the project's own pin map when present. This is the "what do I grab
   * from the bin?" 10% of a full PCB/BOM flow — no KiCad, no netlist.
   * @param {string} projectId
   * @param {string[]} [ownedIds] part ids the user owns (Inventory.ownedIds)
   * @returns {Array<{cap,partId,partName,optional,have,qty,wiringNote}>}
   */
  function bom(projectId, ownedIds) {
    const p = PROJECT_CATALOG.find(x => x.id === projectId);
    if (!p) return [];
    const owned = new Set(ownedIds || []);
    const caps = (p.requiredCaps || []).concat(p.optionalCaps || []);
    // map each capability to ONE representative part (first part that provides it)
    const seen = {};
    const lines = [];
    caps.forEach(cap => {
      if (seen[cap]) return;            // don't list the same cap twice
      seen[cap] = true;
      const part = PARTS.find(pt => (pt.caps || []).indexOf(cap) !== -1);
      if (!part) {                      // capability with no catalog part (e.g. 'mcu')
        const label = CAPABILITY_CANONICAL[cap] || cap;
        const isOpt = (p.optionalCaps || []).indexOf(cap) !== -1;
        lines.push({ cap, partId: null, partName: label, optional: isOpt, have: false, qty: 0, wiringNote: '' });
        return;
      }
      const isOpt = (p.optionalCaps || []).indexOf(cap) !== -1;
      const have = owned.has(part.id);
      const qty = have ? (InventoryQty[part.id] || 1) : 0;
      // wiring note: first pin-map row whose part matches this part's name
      const wn = (p.wiring || []).find(w => w.part && part.name && w.part.toLowerCase().indexOf(part.name.split(' ')[0].toLowerCase()) !== -1);
      lines.push({
        cap, partId: part.id, partName: part.name, optional: isOpt,
        have, qty, wiringNote: wn ? (wn.pin + (wn.note ? ' — ' + wn.note : '')) : ''
      });
    });
    return lines;
  }

  // Filled at runtime by Detail via Engine.setInventory(qtyMap) so bom() can read qty.
  let InventoryQty = {};

  function setInventory(qtyMap) { InventoryQty = qtyMap || {}; }

  return {
    analyze,
    rationale,
    search,
    parseDatasheet,
    partGraph,
    bom,
    setInventory,
    matchProject,
    computeInventoryCaps,
    computeCapQty,
    buildShoppingList,
    moreLike,
    filterProjects,
    learningPaths,
    cydScore,
    sortByCyd,
    PARTS,
    PROJECT_CATALOG,
  };
});
