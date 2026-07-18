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
  function recompute() {
    // v2: analyze() takes the owned qty map directly.
    lastResult = E.analyze(state.owned, state.custom);
    UI.renderProjects(lastResult, buildableEl, nearEl, summaryEl);
    UI.renderShopping(shoppingEl, lastResult.shoppingList);
    const total = Object.values(state.owned).reduce((a, q) => a + q, 0);
    ownedCount.textContent = total + ' part' + (total === 1 ? '' : 's') + ' owned';
  }

  function persist() {
    Inv.save(state);
  }

  // ---- INVENTORY rendering + qty ----
  function renderInventoryNow() {
    // v2: renderInventory now takes the owned MAP and a setQty callback.
    UI.renderInventory(groupsEl, state.owned, (id, qty) => {
      Inv.setQty(state, id, qty);
      renderInventoryNow();   // re-render grid so qty text + checkbox + minus-disable update
      recompute();
    });
  }

  // ---- TAB switching ----
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach(p =>
      p.classList.toggle('active', p.id === 'tab-' + name));
  }
  document.querySelectorAll('.tab').forEach(t =>
    t.addEventListener('click', () => showTab(t.dataset.tab)));

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

  // ---- AI "Surprise me" button (injected into Projects tab header) ----
  // We add it only when a key is present; otherwise a gentle hint stands in.
  function ensureAiButton() {
    if (document.getElementById('btn-ai')) return;
    const head = document.querySelector('#tab-projects h2.section-title'); // first h2 = Buildable Now
    const btn = document.createElement('button');
    btn.id = 'btn-ai'; btn.className = 'btn ghost'; btn.style.marginLeft = '10px';
    btn.textContent = '✨ Surprise me (AI)';
    btn.addEventListener('click', runAi);
    head.appendChild(btn);
  }
  function ensureAiHint() {
    if (document.getElementById('ai-hint')) return;
    const head = document.querySelector('#tab-projects h2.section-title');
    const span = document.createElement('span');
    span.id = 'ai-hint'; span.className = 'muted';
    span.style.marginLeft = '10px'; span.style.fontSize = '.8rem';
    span.textContent = ' · add an API key in ⚙️ Settings to unlock AI ideas';
    head.appendChild(span);
  }
  if (AI.hasKey()) ensureAiButton(); else ensureAiHint();

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
