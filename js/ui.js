/* =============================================================================
 * ui.js  —  RENDERING (turns engine results into DOM)
 * -----------------------------------------------------------------------------
 * WHY SEPARATE FROM app.js
 * app.js owns "state + events + wiring"; ui.js owns "given data, draw HTML".
 * Splitting them keeps each file small and makes the rendering easy to reason
 * about (and later, to test). The UI never decides matching logic — it only
 * shows what Engine.analyze() returns.
 * ===========================================================================*/

(function (root) {
  const T = root.TAXONOMY;   // categories + parts + canonical text
  const E = root.Engine;     // matching engine

  // Tiny helper: create an element with class + html. (Avoids innerHTML for
  // user-derived text where we can, but our data is ours, so templating is safe.)
  function el(tag, cls, html) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Unique, sorted display of "uses your: <part>" names (dedupe DHT22 etc.)
  function usedPartNames(usedParts) {
    const seen = new Set();
    const out = [];
    Object.values(usedParts).forEach(name => {
      if (!seen.has(name)) { seen.add(name); out.push(name); }
    });
    return out;
  }

  // ---------------- INVENTORY ----------------
  function renderInventory(groupsEl, ownedIds, onToggle) {
    groupsEl.innerHTML = '';
    T.CATEGORIES.forEach(cat => {
      const parts = T.PARTS.filter(p => p.cat === cat.id);
      if (!parts.length) return;
      const box = el('div', 'cat');
      box.appendChild(el('h3', null, escapeHtml(cat.name)));
      parts.forEach(part => {
        const row = el('label', 'part');
        const cb = el('input');
        cb.type = 'checkbox';
        cb.checked = ownedIds.includes(part.id);
        cb.addEventListener('change', () => onToggle(part.id, cb.checked));
        row.appendChild(cb);
        row.appendChild(el('span', null, escapeHtml(part.name)));
        box.appendChild(row);
      });
      groupsEl.appendChild(box);
    });
  }

  // ---------------- ONE PROJECT CARD ----------------
  function projectCard(r, kind) {
    const p = r.project;
    const card = el('div', 'card ' + kind);

    card.appendChild(el('h3', null, escapeHtml(p.title)));
    card.appendChild(el('p', 'blurb', escapeHtml(p.blurb)));

    // meta: difficulty + time
    const meta = el('div', 'meta');
    meta.appendChild(el('span', 'badge ' + p.difficulty, p.difficulty));
    meta.appendChild(el('span', 'badge', p.buildTime));
    card.appendChild(meta);

    // WHY (the teaching layer)
    const why = el('div', 'why');
    why.innerHTML = '<b>Why this works / what you&rsquo;ll learn:</b> ' + escapeHtml(p.why);
    card.appendChild(why);

    // concept chips
    if (p.concepts && p.concepts.length) {
      const chips = el('div', 'chips');
      p.concepts.forEach(c => chips.appendChild(el('span', 'chip concept', escapeHtml(c))));
      card.appendChild(chips);
    }

    // "uses your" chips
    const uses = usedPartNames(r.usedParts);
    if (uses.length) {
      const chips = el('div', 'chips');
      chips.appendChild(el('span', 'chip', '<b>Uses your:</b>'));
      uses.forEach(u => chips.appendChild(el('span', 'chip uses', escapeHtml(u))));
      card.appendChild(chips);
    }

    // steps
    if (p.steps && p.steps.length) {
      const ol = el('ol', 'steps');
      p.steps.forEach(s => {
        const li = document.createElement('li');
        li.textContent = s;
        ol.appendChild(li);
      });
      card.appendChild(ol);
    }

    // level-up
    const lu = el('div', 'levelup');
    lu.innerHTML = '<b>Level up:</b> ' + escapeHtml(p.levelUp);
    card.appendChild(lu);

    return card;
  }

  // ---------------- NEAR-MISS CARD (with missing box) ----------------
  function nearCard(r) {
    const card = projectCard(r, 'near');
    // Insert a red "You're missing" box right under the blurb (before why).
    const box = el('div', 'missing-box');
    box.appendChild(el('span', 'label', "You're missing:"));
    const ul = el('ul');
    r.gap.forEach(g => {
      const li = document.createElement('li');
      li.textContent = g.part;
      ul.appendChild(li);
    });
    box.appendChild(ul);
    // Insert after the first two children (h3 + blurb + meta) — find meta, then insert.
    const meta = card.querySelector('.meta');
    card.insertBefore(box, meta ? meta.nextSibling : card.children[1]);
    return card;
  }

  // ---------------- PROJECTS TAB ----------------
  function renderProjects(result, buildableList, nearList, summaryEl) {
    buildableList.innerHTML = '';
    nearList.innerHTML = '';

    const nBuild = result.buildable.length;
    const nNear = result.couldve.length;
    summaryEl.innerHTML =
      `<span class="muted">✅ ${nBuild} buildable &nbsp;·&nbsp; 🔬 ${nNear} near-miss${nNear === 1 ? '' : 'es'}</span>`;

    if (nBuild === 0) {
      buildableList.appendChild(el('div', 'empty',
        'No buildable projects yet. Tick more parts in 🧪 Inventory — or check the 🔬 near-misses below for what to buy next.'));
    } else {
      result.buildable.forEach(r => buildableList.appendChild(projectCard(r, 'buildable')));
    }

    if (nNear === 0) {
      nearList.appendChild(el('div', 'empty',
        'Nothing just out of reach — nice, your inventory covers a lot!'));
    } else {
      // Show up to 4 near-misses (the spec asks for 2–4).
      result.couldve.slice(0, 4).forEach(r => nearList.appendChild(nearCard(r)));
    }
  }

  // ---------------- SHOPPING LIST ----------------
  function renderShopping(listEl, shopping) {
    listEl.innerHTML = '';
    if (!shopping.length) {
      listEl.appendChild(el('div', 'empty',
        'No near-misses yet, so nothing to shop for. Tick parts in 🧪 Inventory to generate a list.'));
      return;
    }
    shopping.forEach(item => {
      const row = el('div', 'shop-item');
      const left = el('div');
      left.appendChild(el('div', 'name', escapeHtml(item.partName)));
      left.appendChild(el('div', 'detail',
        'Unlocks ' + item.unlocks + ' · in ' + item.inNearMisses + ' near-miss(es): ' + escapeHtml(item.projects.join(', '))));
      row.appendChild(left);
      const lev = el('div', 'shop-leverage' + (item.unlocks === 0 ? ' zero' : ''),
        item.unlocks > 0 ? ('+' + item.unlocks + ' project' + (item.unlocks > 1 ? 's' : '')) : 'shared');
      row.appendChild(lev);
      listEl.appendChild(row);
    });
  }

  root.UI = {
    renderInventory, projectCard, nearCard, renderProjects, renderShopping, escapeHtml,
  };
})(window);
