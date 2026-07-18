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
    const { PARTS, CAPABILITY_CANONICAL } = require('./taxonomy.js');
    const { PROJECT_CATALOG } = require('./catalog.js');
    module.exports = factory(PARTS, CAPABILITY_CANONICAL, PROJECT_CATALOG);
  } else {
    // In the browser the data globals already exist (loaded before this file).
    root.Engine = factory(root.TAXONOMY.PARTS, root.TAXONOMY.CAPABILITY_CANONICAL, root.CATALOG.PROJECT_CATALOG);
  }
})(typeof self !== 'undefined' ? self : this, function (PARTS, CAPABILITY_CANONICAL, PROJECT_CATALOG) {

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

  return {
    analyze,
    matchProject,
    computeInventoryCaps,
    computeCapQty,
    buildShoppingList,
    moreLike,
    filterProjects,
    learningPaths,
    PARTS,
    PROJECT_CATALOG,
  };
});
