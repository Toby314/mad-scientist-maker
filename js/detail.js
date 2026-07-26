/* =============================================================================
 * detail.js  —  PROJECT DETAIL VIEW (hash-routed, no server needed)
 * -----------------------------------------------------------------------------
 * WHY A SEPARATE VIEW (instead of a modal)
 * A project detail page (copy-paste code, pin wiring, deeper guide) is a real
 * "destination." Using a hash route (#/project/<id>) makes it: (1) shareable —
 * you can send a friend "mad-scientist-maker/#/project/weather_station" — (2)
 * back-button friendly, and (3) fully static (no server rewrite rules), so it
 * works on GitHub Pages AND from file://. That's the same reason v1 used plain
 * files with no build step.
 *
 * WHAT IT RENDERS
 *  - The full project (why, concepts, steps, level-up)
 *  - A WIRING TABLE auto-built from the project's `wiring` array (offline)
 *  - A clickable "Full assembly guide" link when `guideUrl` exists (#9)
 *  - "More like this" — offline siblings via Engine.moreLike() (#3)
 * NOTE: v2 Phase 1 wires the table + guide + more-like. Copy-paste *code* is a
 * Phase 2 field (catalog `code:[{file,lang,source}]`); the detail view will
 * render it the moment projects carry it.
 * ===========================================================================*/

(function (root) {
  const E = root.Engine;
  const T = root.TAXONOMY;

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function renderWiring(p) {
    const wrap = el('div', 'wiring');
    wrap.appendChild(el('h3', null, '🔌 Wiring (pin map)'));
    if (!p.wiring || !p.wiring.length) {
      wrap.appendChild(el('p', 'hint', 'No pin map recorded for this project yet.'));
      return wrap;
    }
    const table = el('table', 'pin-table');
    const thead = el('thead');
    const hr = el('tr');
    ['Part', 'Signal', 'Pin', 'Note'].forEach(h => hr.appendChild(el('th', null, h)));
    thead.appendChild(hr);
    table.appendChild(thead);
    const tb = el('tbody');
    p.wiring.forEach(w => {
      const tr = el('tr');
      tr.appendChild(el('td', null, escapeHtml(w.part || '')));
      tr.appendChild(el('td', null, escapeHtml(w.signal || '')));
      tr.appendChild(el('td', null, escapeHtml(w.pin || '')));
      tr.appendChild(el('td', null, escapeHtml(w.note || '')));
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    return wrap;
  }

  // PHASE 5 BLOCK 4 — BOM / parts assist.
  // Cross-checks the project's required/optional parts against the user's
  // inventory and renders a ✅ have / ❌ need list + a copy-able shopping list.
  function renderBom(p) {
    const wrap = el('div', 'bom');
    wrap.appendChild(el('h3', null, '🧰 Parts check (BOM)'));
    try {
      const inv = (root.Inventory && root.Inventory.load) ? root.Inventory.load() : { owned: {} };
      const ownedIds = (root.Inventory && root.Inventory.ownedIds) ? root.Inventory.ownedIds(inv) : [];
      E.setInventory(inv.owned || {});
      const lines = E.bom(p.id, ownedIds);
      if (!lines.length) {
        wrap.appendChild(el('p', 'hint', 'No parts mapped for this project yet.'));
        return wrap;
      }
      const list = el('ul', 'bom-list');
      const need = [];
      lines.forEach(L => {
        const li = el('li', 'bom-item' + (L.have ? ' have' : ' need') + (L.optional ? ' optional' : ''));
        const mark = L.have ? '✅' : '❌';
        const qtyTxt = L.have && L.qty > 1 ? ' (×' + L.qty + ')' : '';
        const optTxt = L.optional ? ' (optional)' : '';
        li.appendChild(el('span', 'bom-mark', mark));
        li.appendChild(el('span', 'bom-name', escapeHtml(L.partName) + optTxt + qtyTxt));
        if (L.wiringNote) li.appendChild(el('span', 'bom-note', ' — ' + escapeHtml(L.wiringNote)));
        list.appendChild(li);
        if (!L.have && !L.optional) need.push(L.partName);
      });
      wrap.appendChild(list);
      // shopping list (only the things you don't own)
      const sl = el('div', 'shopping');
      if (need.length) {
        const txt = need.join('\n');
        const copyBtn = el('button', 'btn ghost copy-btn', '📋 Copy shopping list');
        copyBtn.addEventListener('click', () => {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(txt).then(() => { copyBtn.textContent = '✓ Copied!'; setTimeout(() => copyBtn.textContent = '📋 Copy shopping list', 1500); }, () => {});
          }
        });
        sl.appendChild(copyBtn);
      } else {
        sl.appendChild(el('p', 'hint', '🎉 You own everything this project needs — build it!'));
      }
      wrap.appendChild(sl);
    } catch (e) {
      wrap.appendChild(el('p', 'hint', 'Parts check unavailable.'));
    }
    return wrap;
  }

  /**
   * PHASE 5 (v5.1.0) — Substitutions panel. For each required capability, list
   * every catalog part that satisfies it (so "no DHT22? use a BME280") and mark
   * which the user already owns. Pure DOM; reads Engine.substitutions().
   */
  function renderSubstitutions(p) {
    const wrap = el('div', 'subs');
    wrap.appendChild(el('h3', null, '🔄 Part substitutions'));
    try {
      const inv = (root.Inventory && root.Inventory.load) ? root.Inventory.load() : { owned: {} };
      const ownedIds = (root.Inventory && root.Inventory.ownedIds) ? root.Inventory.ownedIds(inv) : [];
      const subs = E.substitutions(p.id, ownedIds);
      if (!subs.length) {
        wrap.appendChild(el('p', 'hint', 'No substitutable parts for this project.'));
        return wrap;
      }
      subs.forEach(s => {
        const row = el('div', 'sub-row');
        row.appendChild(el('span', 'sub-cap', escapeHtml(s.label)));
        const opts = el('span', 'sub-opts');
        s.options.forEach(o => {
          const tag = el('span', 'sub-opt' + (o.owned ? ' owned' : ''),
            escapeHtml(o.name) + (o.owned ? ' ✓' : ''));
          opts.appendChild(tag);
        });
        row.appendChild(opts);
        wrap.appendChild(row);
      });
      wrap.appendChild(el('p', 'hint', 'Any part listed for a capability works — tick whichever you own.'));
    } catch (e) {
      wrap.appendChild(el('p', 'hint', 'Substitutions unavailable.'));
    }
    return wrap;
  }

  function renderMoreLike(p) {
    const wrap = el('div', 'morelike');
    wrap.appendChild(el('h3', null, '🔁 More like this'));
    const sibs = E.moreLike(p, 3);
    if (!sibs.length) {
      wrap.appendChild(el('p', 'hint', 'No similar projects in the catalog yet.'));
      return wrap;
    }
    const list = el('ul', 'morelike-list');
    sibs.forEach(s => {
      const li = document.createElement('li');
      const a = el('a', 'morelike-link', escapeHtml(s.title));
      a.href = '#/project/' + s.id;
      li.appendChild(a);
      wrap.appendChild(list); // ensure list is in the DOM before appending li
      list.appendChild(li);
    });
    return wrap;
  }

  // ---- Phase 3A: verified Arduino/C++ sketch block ----
  function renderCode(p) {
    const wrap = el('div', 'sketch');
    wrap.appendChild(el('h3', null, '🔧 Arduino sketch (copy-paste)'));
    const sd = root.SKETCHES_DATA || {};
    const entry = sd[p.id];
    if (!entry) {
      wrap.appendChild(el('p', 'hint', 'Sketch source not loaded yet.'));
      return wrap;
    }
    const src = entry.source || '';
    const pre = el('pre', 'code-block');
    pre.appendChild(el('code', null, src));
    wrap.appendChild(pre);

    const copy = el('button', 'btn ghost copy-btn', '📋 Copy sketch');
    copy.addEventListener('click', () => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(src).then(
          () => { copy.textContent = '✅ Copied!'; setTimeout(() => (copy.textContent = '📋 Copy sketch'), 1500); },
          () => { copy.textContent = '⚠️ Copy failed'; }
        );
      } else {
        // Fallback for non-secure contexts (file://).
        const ta = document.createElement('textarea');
        ta.value = src; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); copy.textContent = '✅ Copied!'; }
        catch (e) { copy.textContent = '⚠️ Copy failed'; }
        document.body.removeChild(ta);
        setTimeout(() => (copy.textContent = '📋 Copy sketch'), 1500);
      }
    });
    wrap.appendChild(copy);
    return wrap;
  }

  // ---- Phase 5 Block 3: part -> project knowledge graph (offline lists) ----
  // Renders Engine.partGraph(p): for each capability the project uses, the OTHER
  // catalog projects that use it too. Plain lists — the useful adjacency without a
  // force-directed layout lib.
  function renderGraph(p) {
    const wrap = el('div', 'graph');
    wrap.appendChild(el('h3', null, '🕸️ What else uses these parts'));
    const groups = E.partGraph(p.id);
    if (!groups.length) {
      wrap.appendChild(el('p', 'hint', 'No linked projects yet.'));
      return wrap;
    }
    groups.forEach(g => {
      const gw = el('div', 'graph-group');
      gw.appendChild(el('h4', null, (T.CAPABILITY_CANONICAL[g.cap] || g.cap) + ':'));
      const ul = el('ul', 'graph-list');
      g.projects.forEach(pr => {
        const li = document.createElement('li');
        const a = el('a', 'graph-link', escapeHtml(pr.title));
        a.href = '#/project/' + pr.id;
        li.appendChild(a);
        ul.appendChild(li);
      });
      gw.appendChild(ul);
      wrap.appendChild(gw);
    });
    return wrap;
  }

  // Render a project into the detail panel and show it.
  function show(projectId) {
    const p = E.PROJECT_CATALOG.find(x => x.id === projectId);
    const panel = document.getElementById('tab-detail');
    if (!panel) return;
    if (!p) {
      panel.innerHTML = '<div class="empty">Project not found.</div>';
    } else {
      panel.innerHTML = '';
      const back = el('button', 'btn ghost', '← Back to results');
      back.addEventListener('click', () => { location.hash = ''; });
      panel.appendChild(back);

      // PHASE 5 (v5.1.0) — bench actions: printable sheet + copy to notes
      const actions = el('div', 'bench-actions');
      const printBtn = el('button', 'btn ghost', '🖨️ Printable bench sheet');
      printBtn.addEventListener('click', () => {
        document.body.setAttribute('data-print-project', p.id);
        window.print();
        document.body.removeAttribute('data-print-project');
      });
      actions.appendChild(printBtn);
      const notesBtn = el('button', 'btn ghost', '📝 Copy to notes');
      notesBtn.addEventListener('click', () => {
        const inv = (root.Inventory && root.Inventory.load) ? root.Inventory.load() : { owned: {} };
        const ownedIds = (root.Inventory && root.Inventory.ownedIds) ? root.Inventory.ownedIds(inv) : [];
        const md = (root.Share && root.Share.projectMarkdown) ? root.Share.projectMarkdown(p, ownedIds) : '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(md).then(
            () => { notesBtn.textContent = '✓ Copied!'; setTimeout(() => notesBtn.textContent = '📝 Copy to notes', 1500); },
            () => {});
        }
      });
      actions.appendChild(notesBtn);
      panel.appendChild(actions);

      panel.appendChild(el('h2', 'section-title', escapeHtml(p.title)));
      panel.appendChild(el('p', 'blurb', escapeHtml(p.blurb)));

      const meta = el('div', 'meta');
      meta.appendChild(el('span', 'badge ' + p.difficulty, p.difficulty));
      meta.appendChild(el('span', 'badge', p.buildTime));
      panel.appendChild(meta);

      const why = el('div', 'why');
      why.innerHTML = '<b>Why this works / what you’ll learn:</b> ' + escapeHtml(p.why);
      panel.appendChild(why);

      if (p.concepts && p.concepts.length) {
        const chips = el('div', 'chips');
        p.concepts.forEach(c => chips.appendChild(el('span', 'chip concept', escapeHtml(c))));
        panel.appendChild(chips);
      }

      if (p.steps && p.steps.length) {
        panel.appendChild(el('h3', null, 'Steps'));
        const ol = el('ol', 'steps');
        p.steps.forEach(s => { const li = document.createElement('li'); li.textContent = s; ol.appendChild(li); });
        panel.appendChild(ol);
      }

      panel.appendChild(renderWiring(p));
      panel.appendChild(renderBom(p));
      panel.appendChild(renderSubstitutions(p));

      // ---- Phase 5 Block 1: rationale + teach-me in the detail view ----
      // Pull the same analyze() row so the detail matches the card exactly.
      const row = (root.__msmResult && root.__msmResult.buildable.concat(root.__msmResult.couldve))
        .find(x => x.project.id === projectId);
      if (row) {
        const rat = E.rationale(row);
        const ratBox = el('div', 'rationale');
        ratBox.innerHTML = '<b>✅ Why it fits:</b> ' + escapeHtml(rat.fit) +
          (rat.uses.length ? '' : '') ;  // uses chips added below
        panel.appendChild(ratBox);
        if (rat.uses.length) {
          const chipWrap = el('div', 'chips');
          rat.uses.forEach(u => chipWrap.appendChild(el('span', 'chip uses', escapeHtml(u))));
          panel.appendChild(chipWrap);
        }
        const whyNow = el('div', 'why-now');
        whyNow.innerHTML = escapeHtml(rat.whyNow);
        panel.appendChild(whyNow);
      }
      if (p.teach && p.teach.length) {
        const d = document.createElement('details');
        d.className = 'teach';
        const sum = document.createElement('summary');
        sum.textContent = '🧠 Teach me (why each step)';
        d.appendChild(sum);
        const body = el('div', 'teach-body');
        const ol = el('ol');
        p.teach.forEach(t => { const li = document.createElement('li'); li.textContent = t; ol.appendChild(li); });
        body.appendChild(ol);
        d.appendChild(body);
        panel.appendChild(d);
      }

      // ---- Phase 3A: verified Arduino sketch (copy-paste) ----
      panel.appendChild(renderCode(p));

      if (p.guideUrl) {

        const guide = el('a', 'btn guide-link', '🔗 Full assembly guide');
        guide.href = p.guideUrl;
        guide.target = '_blank';
        guide.rel = 'noopener noreferrer';
        panel.appendChild(guide);
      }

      if (p.levelUp) {
        const lu = el('div', 'levelup');
        lu.innerHTML = '<b>Level up:</b> ' + escapeHtml(p.levelUp);
        panel.appendChild(lu);
      }

      panel.appendChild(renderMoreLike(p));
      panel.appendChild(renderGraph(p));
    }

    // Switch to the detail panel. We toggle panels directly (no tab button for
    // detail — it's a destination reached by card click / hash, not a tab).
    document.querySelectorAll('.tab-panel').forEach(pn =>
      pn.classList.toggle('active', pn.id === 'tab-detail'));
    try { if (window.scrollTo) window.scrollTo(0, 0); } catch (_) { /* jsdom has no scrollTo */ }
  }

  // Wire card click + hash navigation.
  function init() {
    // Make any element with [data-project-id] open the detail view.
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-project-id]');
      if (t) { location.hash = '#/project/' + t.getAttribute('data-project-id'); }
    });

    window.addEventListener('hashchange', () => {
      const m = location.hash.match(/^#\/project\/(.+)$/);
      if (m) show(decodeURIComponent(m[1]));
    });

    // If we loaded directly on a project hash, show it after the app renders.
    const m = location.hash.match(/^#\/project\/(.+)$/);
    if (m) setTimeout(() => show(decodeURIComponent(m[1])), 0);
  }

  root.Detail = { init, show };
})(window);
