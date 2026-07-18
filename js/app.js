/* =============================================================================
 * app.js  —  STATE + EVENTS + WIRING (the conductor)
 * -----------------------------------------------------------------------------
 * This file holds the app's STATE (current owned parts), wires up every button,
 * switches tabs, recomputes matches whenever the inventory changes, and
 * registers the PWA service worker. It deliberately keeps NO matching logic —
 * that lives in engine.js. The pattern here: "on any change, recompute + render".
 * ===========================================================================*/

(function (root) {
  const T = root.TAXONOMY;
  const E = root.Engine;
  const UI = root.UI;
  const Inv = root.Inventory;
  const AI = root.AI;

  // ---- STATE (in memory mirror of what's in localStorage) ----
  // v2: state.owned is a QUANTITY MAP { partId: qty } (was v1 ownedIds array).
  let state = Inv.load();   // { version, owned, custom }

  // ---- DOM refs ----
  const $ = sel => document.querySelector(sel);
  const groupsEl   = $('#inventory-groups');
  const ownedCount = $('#owned-count');
  const buildableEl = $('#buildable-list');
  const nearEl      = $('#near-list');
  const summaryEl   = $('#projects-summary');
  const shoppingEl  = $('#shopping-list');

  // ---- RECOMPUTE + RENDER (called on every state change) ----
  let lastResult = null;
  // Phase 2A: display filter (difficulty + topic). Engine still ranks the FULL
  // set; filtering only narrows what's drawn, so the honest counts stay visible.
  let filter = { difficulties: [], tags: [] };

  function currentFilter() {
    const diffs = Array.from(document.querySelectorAll('.f-diff:checked')).map(c => c.value);
    const topic = (document.getElementById('f-topic') || {}).value || '';
    return { difficulties: diffs, tags: topic ? [topic] : [] };
  }

  function recompute() {
    // v2: analyze() takes the owned qty map directly.
    lastResult = E.analyze(state.owned, state.custom);
    filter = currentFilter();
    UI.renderProjects(lastResult, buildableEl, nearEl, summaryEl, 4, filter);
    UI.renderShopping(shoppingEl, lastResult.shoppingList);
    UI.renderLearningPaths(document.getElementById('learning-paths'), E.learningPaths(lastResult.buildable.map(r => r.project.id)));
    const total = Object.values(state.owned).reduce((a, q) => a + q, 0);
    ownedCount.textContent = total + ' part' + (total === 1 ? '' : 's') + ' owned';
  }

  function persist() {
    Inv.save(state);
  }

  // ---- INVENTORY rendering + qty ----
  function renderInventoryNow() {
    // v2: renderInventory now takes the owned MAP and a setQty callback.
    // Phase 2B: also render custom parts with their own qty/edit/remove handlers.
    UI.renderInventory(
      groupsEl, state.owned,
      (id, qty) => {
        Inv.setQty(state, id, qty);
        renderInventoryNow();   // re-render grid so qty text + checkbox + minus-disable update
        recompute();
      },
      state.custom,
      (idx, qty) => {
        // custom part qty is clamped >= 1 by inventory.js normalize on save,
        // but we guard here so the stepper can't go to 0 and hide it.
        state.custom[idx].qty = Math.max(1, qty);
        Inv.save(state);
        renderInventoryNow();
        recompute();
      },
      (idx) => {
        state.custom.splice(idx, 1);
        Inv.save(state);
        renderInventoryNow();
        recompute();
        toast('Custom part removed');
      }
    );
  }

  // ---- Phase 3B: guided custom-part creator (checklist, no token memorizing) ----
  // Build the capability checklist + preset dropdown from taxonomy, once.
  const capsGrid = document.getElementById('custom-caps-grid');
  const capCanon = T.CAPABILITY_CANONICAL;
  function mk(tag, cls, text) {
    // Local createElement helper so this module has no dependency on ui.js's `el`.
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function buildCapsChecklist() {
    capsGrid.innerHTML = '';
    T.CAPABILITY_GROUPS.forEach(group => {
      const fieldset = mk('div', 'cap-group');
      fieldset.appendChild(mk('h4', null, group.name));
      const chips = mk('div', 'cap-chips');
      group.caps.forEach(cap => {
        if (!capCanon[cap]) return;              // skip tokens with no friendly name
        const label = mk('label', 'cap-chip');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = cap;
        cb.className = 'cap-check';
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + capCanon[cap]));
        chips.appendChild(label);
      });
      fieldset.appendChild(chips);
      capsGrid.appendChild(fieldset);
    });
  }
  function selectedCaps() {
    return Array.from(capsGrid.querySelectorAll('.cap-check:checked')).map(cb => cb.value);
  }
  function syncCapsPreview() {
    const caps = selectedCaps();
    document.getElementById('custom-caps-preview').textContent =
      caps.length ? caps.join(', ') : '(none ticked)';
  }
  capsGrid.addEventListener('change', syncCapsPreview);

  // "Like a board" preset: pre-tick the caps of a known board.
  const presetEl = document.getElementById('custom-preset');
  function buildPresetOptions() {
    T.PARTS.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      presetEl.appendChild(opt);
    });
  }
  presetEl.addEventListener('change', () => {
    const part = T.PARTS.find(p => p.id === presetEl.value);
    // clear all first
    capsGrid.querySelectorAll('.cap-check').forEach(cb => { cb.checked = false; });
    if (part) {
      part.caps.forEach(cap => {
        const cb = capsGrid.querySelector('.cap-check[value="' + cap + '"]');
        if (cb) cb.checked = true;
      });
    }
    syncCapsPreview();
  });

  buildCapsChecklist();
  buildPresetOptions();

  function addCustomPart() {
    const nameEl = document.getElementById('custom-name');
    const name = nameEl.value.trim();
    if (!name) { toast('Give the part a name'); nameEl.focus(); return; }
    const caps = selectedCaps();
    if (!caps.length) { toast('Tick at least one capability'); return; }
    state.custom = state.custom || [];
    state.custom.push({ name, caps, qty: 1 });
    Inv.save(state);
    // reset the form for the next entry
    nameEl.value = '';
    capsGrid.querySelectorAll('.cap-check').forEach(cb => { cb.checked = false; });
    presetEl.value = '';
    syncCapsPreview();
    renderInventoryNow(); recompute();
    toast('Added "' + name + '" — it now counts toward matching');
  }
  document.getElementById('btn-custom-add').addEventListener('click', addCustomPart);

  // ---- TAB switching ----
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'tab-' + name));
  }
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => showTab(t.dataset.tab)));

  // ---- Phase 2A: filters re-render project lists live (engine untouched) ----
  document.querySelectorAll('.f-diff').forEach(c =>
    c.addEventListener('change', () => { filter = currentFilter(); recompute(); }));
  const topicSel = document.getElementById('f-topic');
  if (topicSel) topicSel.addEventListener('change', () => { filter = currentFilter(); recompute(); });
  const clearFilters = document.getElementById('f-clear');
  if (clearFilters) clearFilters.addEventListener('click', () => {
    document.querySelectorAll('.f-diff').forEach(c => { c.checked = false; });
    if (topicSel) topicSel.value = '';
    filter = { difficulties: [], tags: [] };
    recompute();
  });

  // ---- TOAST (tiny feedback) ----
  let toastTimer = null;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Sample inventory from the spec (used for the self-test + a demo for you).
  // v2: stored as a quantity map (each sample part = qty 1).
  const SAMPLE = { esp32: 1, dht22: 1, ssd1306: 1, pir: 1, relay: 1, led: 1, buzzer: 1 };

  $('#btn-sample').addEventListener('click', () => {
    state.owned = Object.assign({}, SAMPLE);
    state.custom = [];
    persist(); renderInventoryNow(); recompute();
    toast('Loaded sample inventory');
  });
  $('#btn-clear').addEventListener('click', () => {
    if (!confirm('Clear all owned parts?')) return;
    state.owned = {}; state.custom = [];
    persist(); renderInventoryNow(); recompute();
    toast('Inventory cleared');
  });
  $('#btn-export').addEventListener('click', () => Inv.exportToFile(state));
  function handleImport(file) {
    if (!file) return;
    Inv.importFromFile(file).then(s => {
      state = s; renderInventoryNow(); recompute(); toast('Imported inventory');
    }).catch(err => toast(err.message));
  }
  $('#file-import').addEventListener('change', e => handleImport(e.target.files[0]));
  $('#file-import2').addEventListener('change', e => handleImport(e.target.files[0]));

  // ---- BUTTONS: Shopping ----
  $('#btn-copy-shop').addEventListener('click', () => {
    if (!lastResult || !lastResult.shoppingList.length) return toast('Nothing to copy');
    const lines = lastResult.shoppingList.map(i => `- ${i.partName}  (unlocks ${i.unlocks}, in ${i.inNearMisses} near-miss: ${i.projects.join(', ')})`);
    const text = 'Mad Scientist Maker — Smart Shopping List\n' + lines.join('\n');
    navigator.clipboard.writeText(text).then(() => toast('Shopping list copied'))
      .catch(() => toast('Copy failed — select manually'));
  });
  $('#btn-export-shop').addEventListener('click', () => {
    if (!lastResult || !lastResult.shoppingList.length) return toast('Nothing to export');
    const blob = new Blob([JSON.stringify(lastResult.shoppingList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'mad-scientist-shopping.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  // ---- BUTTONS: Settings ----
  // Theme
  const savedTheme = localStorage.getItem('msm.theme');
  if (savedTheme === 'light') { document.documentElement.dataset.theme = 'light'; $('#chk-light').checked = true; }
  $('#chk-light').addEventListener('change', e => {
    if (e.target.checked) { document.documentElement.dataset.theme = 'light'; localStorage.setItem('msm.theme', 'light'); }
    else { document.documentElement.removeAttribute('data-theme'); localStorage.setItem('msm.theme', 'dark'); }
  });

  // AI settings
  const aiSettings = AI.loadSettings();
  $('#ai-endpoint').value = aiSettings.endpoint || '';
  $('#ai-key').value = aiSettings.key || '';
  $('#ai-model').value = aiSettings.model || '';
  $('#btn-ai-save').addEventListener('click', () => {
    const s = { endpoint: $('#ai-endpoint').value.trim(), key: $('#ai-key').value.trim(), model: $('#ai-model').value.trim() };
    AI.saveSettings(s);
    $('#ai-status').textContent = s.key ? 'Saved. AI suggestions unlocked.' : 'Saved (no key — AI stays off).';
  });
  $('#btn-ai-clear').addEventListener('click', () => {
    AI.saveSettings({ endpoint: '', key: '', model: '' });
    $('#ai-endpoint').value = ''; $('#ai-key').value = ''; $('#ai-model').value = '';
    $('#ai-status').textContent = 'Key cleared. App still works fully offline.';
  });

  // Data resets
  $('#btn-export2').addEventListener('click', () => Inv.exportToFile(state));
  $('#btn-reset').addEventListener('click', () => {
    if (!confirm('Reset inventory AND AI settings?')) return;
    localStorage.removeItem('msm.inventory.v2');
    localStorage.removeItem('msm.ai.v1');
    state = { version: 2, owned: {}, custom: [] };
    renderInventoryNow(); recompute(); toast('Reset complete');
  });

  // ---- "Surprise me" (Phase 2A) ----
  // Two flavours, both clearly labelled:
  //   1) OFFLINE: pick a random buildable/near project you can actually do —
  //      always available, no key, great for "just give me something to build".
  //   2) AI: invent brand-new ideas from your parts (only if an API key is set).
  function ensureSurprise() {
    if (document.getElementById('btn-surprise')) return;
    const head = document.querySelector('#tab-projects h2.section-title'); // first h2 = Buildable Now
    const wrap = document.createElement('span');
    wrap.style.marginLeft = '10px';
    wrap.style.display = 'inline-flex';
    wrap.style.gap = '8px';
    wrap.style.verticalAlign = 'middle';

    const offline = document.createElement('button');
    offline.id = 'btn-surprise'; offline.className = 'btn ghost small';
    offline.textContent = '🎲 Surprise me';
    offline.addEventListener('click', runSurprise);
    wrap.appendChild(offline);

    if (AI.hasKey()) {
      const ai = document.createElement('button');
      ai.id = 'btn-ai'; ai.className = 'btn ghost small';
      ai.textContent = '✨ Surprise me (AI)';
      ai.addEventListener('click', runAi);
      wrap.appendChild(ai);
    } else {
      const hint = document.createElement('span');
      hint.id = 'ai-hint'; hint.className = 'muted';
      hint.style.fontSize = '.8rem';
      hint.textContent = ' · add an API key in ⚙️ Settings for AI ideas';
      wrap.appendChild(hint);
    }
    head.appendChild(wrap);
  }

  function runSurprise() {
    if (!lastResult) return;
    const pool = lastResult.buildable.concat(lastResult.couldve);
    if (!pool.length) { toast('Load inventory first to get a surprise'); return; }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    location.hash = '#/project/' + pick.project.id;
    toast('🎲 ' + pick.project.title);
  }

  if (AI.hasKey()) ensureSurprise(); else ensureSurprise();

  async function runAi() {
    if (!AI.hasKey()) { toast('Add an API key in Settings first'); return; }
    const btn = document.getElementById('btn-ai');
    btn.disabled = true; btn.textContent = '✨ Thinking…';
    try {
      const capNames = Object.keys(state.owned).map(id => (T.PARTS.find(p => p.id === id) || {}).name || id);
      const ideas = await AI.suggest(capNames, 'surprise');
      // Render AI idea cards above the buildable list, clearly labelled.
      ideas.forEach(idea => {
        const card = document.createElement('div');
        card.className = 'card ai-card';
        card.innerHTML =
          '<span class="ai-tag">AI-GENERATED · UNVERIFIED</span>' +
          '<h3>' + UI.escapeHtml(idea.title || 'Idea') + '</h3>' +
          '<p class="blurb">' + UI.escapeHtml(idea.blurb || '') + '</p>' +
          '<div class="why"><b>Why:</b> ' + UI.escapeHtml(idea.why || '') + '</div>' +
          (idea.steps ? '<ol class="steps">' + idea.steps.map(s => '<li>' + UI.escapeHtml(s) + '</li>').join('') + '</ol>' : '');
        buildableEl.insertBefore(card, buildableEl.firstChild);
      });
      toast('Added ' + ideas.length + ' AI idea(s)');
    } catch (e) {
      toast('AI failed: ' + e.message);
    } finally {
      btn.disabled = false; btn.textContent = '✨ Surprise me (AI)';
    }
  }

  // ---- PWA SERVICE WORKER registration (only over http(s); not file://) ----
  // On file:// the registration is skipped — the app still runs, just not
  // installable. We register as soon as the document is ready (works whether
  // the script runs before or after the 'load' event). See SPEC.md decision D3.
  function registerSW() {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(err =>
        console.warn('SW registration skipped:', err));
    }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener('load', registerSW);
  }

  // ---- INITIAL RENDER ----
  Detail.init();          // v2: hash routing + card-click -> detail view
  renderInventoryNow();
  recompute();
})(window);
