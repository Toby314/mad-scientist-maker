// dom_smoke_v51.js — proves Phase 5 v5.1.0 features render in a real browser DOM:
// substitutions panel in detail view, build-next panel on Projects tab, and the
// printable/copy-to-notes buttons exist. Run: node dom_smoke_v51.js (needs jsdom)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.localStorage = window.localStorage;
window.scrollTo = () => {};

['js/taxonomy.js', 'js/catalog.js', 'js/engine.js', 'js/share.js', 'js/inventory.js',
 'js/ai.js', 'js/ui.js', 'js/detail.js', 'js/app.js']
  .forEach(f => { window.eval(fs.readFileSync(path.join(root, f), 'utf8')); });

let ok = true;
const assert = (c, m) => { if (!c) { ok = false; console.log('  FAIL:', m); } };

// load a sample inventory so buildable + detail have data
window.document.querySelector('#btn-sample').click();

setTimeout(() => {
  // 1) build-next panel rendered on Projects tab
  const bn = window.document.querySelector('#build-next .next-card');
  assert(!!bn, 'build-next panel renders a suggestion card');
  if (bn) assert(/Build this next/.test(bn.textContent), 'build-next card has heading');

  // 2) open a detail view and check substitutions + bench action buttons
  const E = window.Engine;
  const p = E.PROJECT_CATALOG.find(x => (E.analyze({ esp32: 1, dht22: 1, ssd1306: 1 }, []).buildable.map(r => r.project.id)).indexOf(x.id) !== -1);
  window.Detail.show(p.id);
  const panel = window.document.getElementById('tab-detail');
  const subs = panel.querySelector('.subs');
  assert(!!subs, 'substitutions panel rendered in detail');
  if (subs) {
    const rows = subs.querySelectorAll('.sub-row');
    assert(rows.length > 0, 'substitutions has at least one capability row');
    assert(!!subs.querySelector('.sub-opt.owned'), 'substitutions marks an owned part');
  }
  const printBtn = Array.from(panel.querySelectorAll('button')).find(b => /Printable bench sheet/.test(b.textContent));
  const notesBtn = Array.from(panel.querySelectorAll('button')).find(b => /Copy to notes/.test(b.textContent));
  assert(!!printBtn, 'printable bench sheet button exists');
  assert(!!notesBtn, 'copy to notes button exists');

  // 3) Share.projectMarkdown produces memory-wiki markdown
  const md = window.Share.projectMarkdown(p, ['esp32', 'dht22']);
  assert(/^# /.test(md), 'projectMarkdown starts with an H1 title');
  assert(/Parts needed/.test(md), 'projectMarkdown has a Parts needed table');
  assert(/Exported from Mad Scientist Maker/.test(md), 'projectMarkdown carries the source footer');

  console.log(ok ? 'V51_DOM_OK' : 'V51_DOM_FAIL');
  process.exitCode = ok ? 0 : 1;
}, 400);
