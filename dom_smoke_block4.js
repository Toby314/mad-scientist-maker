// dom_smoke_block4.js — proves Phase 5 Block 4 (BOM parts-check + shopping list).
// Run: node dom_smoke_block4.js   (jsdom required: npm i jsdom)
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const root = __dirname;

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;
global.window = window; global.document = window.document;
global.navigator = window.navigator; global.localStorage = window.localStorage;
global.location = window.location; global.Blob = window.Blob; global.URL = window.URL;
window.scrollTo = () => {};
global.console = console;

['js/taxonomy.js','js/catalog.js','js/engine.js','js/inventory.js','js/detail.js']
  .forEach(f => { window.eval(fs.readFileSync(path.join(root, f), 'utf8')); });

let ok = true;
const assert = (c, m) => { if (!c) { ok = false; console.log('  FAIL:', m); } };

// 1) Engine.bom maps caps -> parts and respects inventory
const E = window.Engine;
const lines = E.bom('blink_button', ['led', 'button']);
assert(lines.length >= 3, 'bom returns lines for blink_button');
const led = lines.find(l => l.partId === 'led');
assert(led && led.have === true, 'owned led shows have=true');
const mcu = lines.find(l => l.cap === 'mcu');
assert(mcu && mcu.have === false, 'mcu (board) shows have=false when not owned');

// 2) BOM renders on detail view with have/need marks + shopping copy button
//    NOTE: Detail.show() reads root.__msmResult (populated by Engine.analyze,
//    just like app.js recompute() does before every render). Without it the
//    Block-1 rationale branch throws. Mirror the real flow: set inventory,
//    analyze, then show.
const Detail = window.Detail;
const Inventory = window.Inventory;
// give the inventory an owned qty map so analyze() + bom() have something to read
const inv = Inventory.load();
['led','button','resistor'].forEach(id => Inventory.setQty(inv, id, 2));
Inventory.save(inv);
const ownedMap = inv.owned; // v2 inventory already stores a qty map: { partId: qty }
window.__msmResult = E.analyze(ownedMap, inv.custom || []);
E.setInventory(ownedMap);
const panel = window.document.getElementById('tab-detail');
Detail.show('blink_button');
const bomHtml = panel.textContent || '';
const hasBom = /Parts check/.test(bomHtml) && /✅|❌/.test(bomHtml) && /Copy shopping list/.test(bomHtml);
assert(hasBom, 'BOM panel rendered with marks + copy button');
const needCount = (panel.querySelectorAll('.bom-item.need') || []).length;
assert(needCount >= 1, 'at least one needed item shown (' + needCount + ')');

// 3) when a real MCU board (esp32) is also owned, every BOM line shows have=true
//    (mcu is a capability provided by boards, not a standalone tickable part)
const allIds = Inventory.ownedIds(inv).concat(['esp32']);
// blink_button needs: mcu(provided by esp32), button, led, (optional resistor)
const fullLines = E.bom('blink_button', allIds);
const allHave = fullLines.every(l => l.have);
assert(allHave, 'with esp32 owned (provides mcu), all lines have=true');

console.log('BOM lines for blink_button:', lines.length, '| owned-led have:', led && led.have, '| need items:', needCount);
console.log(ok ? 'BLOCK4_DOM_OK' : 'BLOCK4_DOM_FAIL');
process.exitCode = ok ? 0 : 1;
