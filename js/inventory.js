/* =============================================================================
 * inventory.js  —  PERSISTENCE (localStorage) + EXPORT/IMPORT
 * -----------------------------------------------------------------------------
 * WHY
 * Your inventory (the parts you own) must survive a page reload and be portable
 * (back up / share / move to another browser). The browser gives us localStorage
 * for the first, and the File API (download + <input type=file>) for the second.
 *
 * v2 CHANGE — QUANTITY:
 * v1 stored ownership as a SET: `ownedIds: ['led','esp32',...]` (owned = boolean,
 * no count). That means "I have 1 LED" and "I have 20 LEDs" looked identical, and
 * a project needing 3 LEDs couldn't be told apart from one needing 1. v2 stores a
 * QUANTITY MAP instead: `owned: { led: 20, esp32: 1 }`. A part present in the map
 * is owned; its value is how many you have. Custom parts also carry a quantity.
 *
 * V1 -> V2 MIGRATION:
 * On load, if we find the old `version:1` shape (`ownedIds:[...]`), we convert it
 * to the v2 map so your old backups still load (and old exports can be re-imported).
 *
 * The stored shape is tiny and human-readable on purpose:
 *   { version: 2, owned: { partId: qty }, custom: [{name, caps:[], qty}] }
 * ===========================================================================*/

(function (root) {
  const KEY = 'msm.inventory.v2';

  // Convert any older/raw shape into the canonical v2 state.
  function normalize(data) {
    if (!data || typeof data !== 'object') return { version: 2, owned: {}, custom: [] };

    // v1 migration: `ownedIds` (array) -> `owned` (qty map of 1s)
    let owned = {};
    if (Array.isArray(data.ownedIds)) {
      data.ownedIds.forEach(id => { if (id) owned[id] = 1; });
    } else if (data.owned && typeof data.owned === 'object') {
      // strip non-positive / non-numeric counts
      Object.keys(data.owned).forEach(id => {
        const q = Number(data.owned[id]);
        if (id && q >= 1) owned[id] = Math.floor(q);
      });
    }

    let custom = [];
    if (Array.isArray(data.custom)) {
      custom = data.custom
        .filter(p => p && p.name)
        .map(p => ({ name: String(p.name), caps: Array.isArray(p.caps) ? p.caps : [], qty: Math.max(1, Math.floor(Number(p.qty) || 1)) }));
    }

    return { version: 2, owned, custom };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { version: 2, owned: {}, custom: [] };
      return normalize(JSON.parse(raw));
    } catch (e) {
      console.warn('Inventory load failed, starting fresh:', e);
      return { version: 2, owned: {}, custom: [] };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save inventory (storage full or blocked):', e);
    }
  }

  // Set the owned quantity for a part id (0 or missing = not owned).
  function setQty(state, id, qty) {
    qty = Math.max(0, Math.floor(Number(qty) || 0));
    if (qty >= 1) state.owned[id] = qty;
    else delete state.owned[id];
    save(state);
    return state;
  }

  // Returns the list of owned part ids (for the engine, which still thinks in ids).
  function ownedIds(state) {
    return Object.keys(state.owned);
  }

  // ---- EXPORT: turn the current state into a downloadable .json file ----------
  function exportToFile(state) {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `mad-scientist-inventory-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---- IMPORT: read a user-picked .json file back into state ------------------
  // Returns a Promise that resolves with the parsed+nORMALIZED state.
  function importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const state = normalize(data); // also handles v1 `ownedIds` files
          save(state);
          resolve(state);
        } catch (e) {
          reject(new Error('That file is not valid inventory JSON.'));
        }
      };
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.readAsText(file);
    });
  }

  root.Inventory = { KEY, load, save, setQty, ownedIds, normalize, exportToFile, importFromFile };
})(window);
