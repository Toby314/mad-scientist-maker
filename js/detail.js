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
    table.innerHTML =
      '<thead><tr><th>Component</th><th>Signal</th><th>Pin</th><th>Note</th></tr></thead>';
    const tb = el('tbody');
    p.wiring.forEach(w => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        `<td>${escapeHtml(w.part)}</td><td>${escapeHtml(w.signal)}</td>` +
        `<td class="pin">${escapeHtml(w.pin)}</td><td>${escapeHtml(w.note || '')}</td>`;
      tb.appendChild(tr);
    });
    table.appendChild(tb);
    wrap.appendChild(table);
    wrap.appendChild(el('p', 'hint',
      'Pin numbers are a starting point for an ESP32; adapt if your board differs.'));
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
