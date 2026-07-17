/* =============================================================================
 * inventory.js  —  PERSISTENCE (localStorage) + EXPORT/IMPORT
 * -----------------------------------------------------------------------------
 * WHY
 * Your inventory (the parts you own) must survive a page reload and be portable
 * (back up / share / move to another browser). The browser gives us localStorage
 * for the first, and the File API (download + <input type=file>) for the second.
 *
 * The stored shape is tiny and human-readable on purpose:
 *   { version: 1, ownedIds: [...], custom: [{name, caps:[]}] }
 * Keeping it as plain JSON means YOU can hand-edit your backup file too.
 * ===========================================================================*/

(function (root) {
  const KEY = 'msm.inventory.v1';

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { version: 1, ownedIds: [], custom: [] };
      const data = JSON.parse(raw);
      // Defensive: make sure the shape is what we expect even if an old file.
      return {
        version: 1,
        ownedIds: Array.isArray(data.ownedIds) ? data.ownedIds : [],
        custom: Array.isArray(data.custom) ? data.custom : [],
      };
    } catch (e) {
      console.warn('Inventory load failed, starting fresh:', e);
      return { version: 1, ownedIds: [], custom: [] };
    }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Could not save inventory (storage full or blocked):', e);
    }
  }

  function setOwned(ownedIds, custom) {
    const state = { version: 1, ownedIds: ownedIds.slice(), custom: custom || [] };
    save(state);
    return state;
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
  // Returns a Promise that resolves with the parsed state (or rejects on bad file).
  function importFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          const state = {
            version: 1,
            ownedIds: Array.isArray(data.ownedIds) ? data.ownedIds : [],
            custom: Array.isArray(data.custom) ? data.custom : [],
          };
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

  root.Inventory = { load, save, setOwned, exportToFile, importFromFile };
})(window);
