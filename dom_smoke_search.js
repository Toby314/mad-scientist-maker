// dom_smoke_search.js — proves Phase 5 Block 2 search box works in a real DOM.
// Run: node dom_smoke_search.js   (jsdom required: npm i jsdom)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

['js/taxonomy.js','js/catalog.js','js/engine.js','js/inventory.js','js/ai.js','js/ui.js','js/detail.js','js/app.js']
  .forEach(f => window.eval(fs.readFileSync(path.join(root, f), 'utf8')));

setTimeout(() => {
  const searchEl = window.document.getElementById('project-search');
  const resultsEl = window.document.getElementById('search-results');
  if (!searchEl) { console.log('FAIL: no #project-search'); process.exitCode = 1; return; }

  // 1) typing "motion sensor" shows results and includes the PIR part + motion project
  searchEl.value = 'motion sensor';
  searchEl.dispatchEvent(new window.Event('input'));
  const hidden = resultsEl.hidden;
  const txt = resultsEl.textContent || '';
  const ok = !hidden && /PIR/.test(txt) && /Motion/.test(txt);
  console.log('search "motion sensor" -> visible:', !hidden, '| shows PIR + Motion:', /PIR/.test(txt) && /Motion/.test(txt));

  // 2) clicking a part result ticks it into inventory (owned count grows)
  const partBtn = resultsEl.querySelector('.search-part');
  const before = window.document.getElementById('owned-count').textContent;
  if (partBtn) partBtn.click();
  const after = window.document.getElementById('owned-count').textContent;
  console.log('click part -> owned count:', before, '->', after, '| changed:', before !== after);

  const okAll = ok && partBtn && before !== after;
  console.log(okAll ? 'SEARCH_DOM_OK' : 'SEARCH_DOM_FAIL');
  process.exitCode = okAll ? 0 : 1;
}, 300);
