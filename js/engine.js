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

  /**
   * Turn an inventory (array of owned part ids, plus optional custom parts)
   * into the SET of capabilities those parts provide.
   * @param {string[]} ownedIds
   * @param {Array} customParts  optional [{name, caps:[]}] the user typed in
   * @returns {Set<string>} capability tokens
   */
  function computeInventoryCaps(ownedIds, customParts) {
    const caps = new Set();
    (ownedIds || []).forEach(id => {
      const part = PART_BY_ID[id];
      if (part) part.caps.forEach(c => caps.add(c));
    });
    (customParts || []).forEach(p => {
      if (p && Array.isArray(p.caps)) p.caps.forEach(c => caps.add(c));
    });
    return caps;
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

  /**
   * Match ONE project against the inventory capabilities.
   * @returns {object} status + missing caps + used part names + score
   */
  function matchProject(project, capSet, ownedIds, customParts) {
    const have = capSet;
    const reqMissing = project.requiredCaps.filter(c => !have.has(c));
    const optHave = project.optionalCaps.filter(c => have.has(c));

    // Map each satisfied cap -> a friendly owned part name (for display).
    const usedParts = {};
    project.requiredCaps.concat(project.optionalCaps).forEach(c => {
      if (have.has(c)) {
        const p = findOwnedPartForCap(c, ownedIds, customParts);
        if (p) usedParts[c] = p.name;
      }
    });

    if (reqMissing.length === 0) {
      // ---- BUILDABLE NOW -----------------------------------------------------
      const score =
        optHave.length * 2 +            // using more of your gear is better
        (project.coolness || 0) +       // cooler = more fun to build
        (project.learning || 0) -       // more educational = better for a learner
        (DIFF_PENALTY[project.difficulty] || 0); // slight ease bias for new makers
      return {
        project, status: 'buildable', missing: [], optHave, usedParts, score,
      };
    }

    // A genuine near-miss means you already have SOME of the project's required
    // capabilities (so you're "almost there"), not that you own nothing. We
    // therefore only call it a near-miss when at least one required cap is
    // already satisfied. (With an empty inventory you're not "1–2 parts away"
    // from anything — you're everything-away — so we stay quiet.)
    const requiredPresent = project.requiredCaps.length - reqMissing.length;

    if (reqMissing.length >= 1 && reqMissing.length <= 2 && requiredPresent >= 1) {
      // ---- COULD'VE BEEN (near-miss, 1–2 parts away) ------------------------
      const gap = reqMissing.map(c => ({
        cap: c,
        // The human-friendly "buy this exact thing" wording from taxonomy.js.
        part: CAPABILITY_CANONICAL[c] || c,
      }));
      return { project, status: 'near', missing: reqMissing, gap, usedParts, score: 0 };
    }

    // ---- too far (3+ missing) ------------------------------------------------
    return { project, status: 'far', missing: reqMissing, gap: [], usedParts, score: 0 };
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
  function analyze(ownedIds, customParts) {
    const capSet = computeInventoryCaps(ownedIds, customParts);
    const buildable = [];
    const near = [];

    PROJECT_CATALOG.forEach(project => {
      const r = matchProject(project, capSet, ownedIds, customParts);
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
      inventoryCaps: Array.from(capSet),
    };
  }

  return {
    analyze,
    matchProject,
    computeInventoryCaps,
    buildShoppingList,
    PARTS,
    PROJECT_CATALOG,
  };
});
