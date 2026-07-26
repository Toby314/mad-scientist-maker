// dom_smoke_phase5.js — proves Phase 5 Block 1 renders in a real browser DOM.
// Run: node dom_smoke_phase5.js   (jsdom must be installed: npm i jsdom)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// runScripts:'dangerously' so window.eval executes each file in the window's
// global scope — exactly like a browser, where window.Engine === bare Engine.
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

['js/taxonomy.js','js/catalog.js','js/engine.js','js/inventory.js','js/ai.js','js/ui.js','js/detail.js','js/app.js']
  .forEach(f => {
    const code = fs.readFileSync(path.join(root, f), 'utf8');
    window.eval(code);
  });

function count() {
  const cards = window.document.querySelectorAll('.card.buildable');
  let rat = 0, teach = 0, nearRat = 0;
  cards.forEach(c => { if (c.querySelector('.rationale')) rat++; if (c.querySelector('.teach')) teach++; });
  window.document.querySelectorAll('.card.near').forEach(c => { if (c.querySelector('.rationale')) nearRat++; });
  return { buildable: cards.length, rat, teach, nearRat };
}

window.document.querySelector('#btn-sample').click();

setTimeout(() => {
  const a = count();
  console.log('buildable cards:', a.buildable, '| with rationale:', a.rat, '| with teach-me:', a.teach, '| near with rationale:', a.nearRat);
  const ok = a.buildable > 0 && a.rat > 0 && a.teach > 0 && a.nearRat > 0;
  console.log(ok ? 'DOM_RENDER_OK' : 'DOM_RENDER_FAIL');
  process.exitCode = ok ? 0 : 1;
}, 300);
