/* test/dom.test.js — runs the REAL app files inside a jsdom DOM and asserts output.
 * This is our browser-equivalent verification since the sandbox browser backend
 * is unavailable. It loads index.html + the actual js/*.js files and checks the
 * rendered DOM: buildable cards, near-miss gap boxes, shopping list leverage.
 * Run with: npm test   (which runs engine.test.js then this file)
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Resolve the project root relative to THIS file (works from any cwd).
const APP = path.resolve(__dirname, '..');
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
};

// --- Build a DOM from the real index.html (scripts are added manually below) ---
const html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:8123/' });
const { window } = dom;

// jsdom lacks these browser APIs the app touches; stub them minimally.
window.localStorage = (() => { let s = {}; return {
  getItem: k => (k in s ? s[k] : null), setItem: (k, v) => s[k] = String(v),
  removeItem: k => delete s[k], clear: () => s = {},
}; })();
window.confirm = () => true;
window.navigator.clipboard = { writeText: () => Promise.resolve() };
window.URL.createObjectURL = () => 'blob:fake';
window.URL.revokeObjectURL = () => {};
// Service worker: present + http protocol so app.js tries to register.
// jsdom doesn't expose navigator.serviceWorker by default — define it.
Object.defineProperty(window.navigator, 'serviceWorker', {
  configurable: true,
  value: { register: (url) => { window.__swUrl = url; return Promise.resolve(); } },
});
if (!window.FileReader) window.FileReader = class { readAsText() {} };

const doc = window.document;
const loadScript = (rel) => {
  const code = fs.readFileSync(path.join(APP, rel), 'utf8');
  const fn = new window.Function(code); // run in window context
  fn.call(window);
};

// Load in the SAME order index.html uses.
['js/taxonomy.js', 'js/catalog.js', 'js/engine.js', 'js/inventory.js', 'js/ai.js', 'js/ui.js', 'js/detail.js', 'js/app.js']
  .forEach(loadScript);

// jsdom keeps readyState as 'loading', so app.js attached a 'load' listener for
// the SW. Fire it (a real browser does this automatically) to exercise the path.
window.dispatchEvent(new window.Event('load'));

console.log('\n=== TEST 1: initial (empty inventory) ===');
assert(doc.querySelectorAll('#buildable-list .card').length === 0, 'no buildable cards when empty');
assert(doc.querySelector('#buildable-list .empty'), 'empty-state shown for buildable');
assert(doc.querySelector('#near-list .empty'), 'empty-state shown for near');

console.log('\n=== TEST 2: click "Load sample inventory" ===');
doc.getElementById('btn-sample').click();

const buildCards = doc.querySelectorAll('#buildable-list .card.buildable');
const nearCards = doc.querySelectorAll('#near-list .card.near');
const ownedTxt = doc.getElementById('owned-count').textContent;
console.log('   owned count text =', ownedTxt);
console.log('   buildable cards =', buildCards.length, '| near cards =', nearCards.length);
assert(buildCards.length === 6, 'exactly 6 buildable cards (matches Node engine test)');
assert(nearCards.length >= 4, 'shows >=4 near-miss cards (v2 widened 1-3 window)');
assert(/7 parts owned/.test(ownedTxt), 'owned-count reads 7 (qty map total)');

const titles = Array.from(buildCards).map(c => c.querySelector('h3').textContent);
console.log('   buildable titles:', titles.join(' | '));
assert(titles.includes('Mini Weather Station'), 'Mini Weather Station is buildable');
assert(doc.querySelector('#buildable-list .why'), 'buildable card has a WHY/teaching block');
assert(doc.querySelector('#buildable-list .steps li'), 'buildable card has numbered steps');
assert(doc.querySelector('#buildable-list .chip.uses'), 'buildable card lists "Uses your" parts');
// v2: every card has a "View details" action button.
assert(doc.querySelector('#buildable-list .card-actions [data-project-id]'), 'buildable card has View-details action');

const missBox = doc.querySelector('#near-list .missing-box');
assert(missBox, 'near-miss card has a missing-box');
const missText = missBox ? missBox.textContent : '';
console.log('   a missing-box says:', missText.replace(/\s+/g, ' ').trim().slice(0, 80));
assert(/You're missing/.test(missText), 'missing-box labels what is missing');
assert(/RTC|LoRa|RFID|button|encoder|moisture/i.test(missText), 'missing-box names a concrete part');

console.log('\n=== TEST 3: Smart Shopping List (leverage sort) ===');
const shopRows = doc.querySelectorAll('#shopping-list .shop-item');
console.log('   shopping rows =', shopRows.length);
assert(shopRows.length > 0, 'shopping list populated from near-misses');
const firstRow = shopRows[0];
const firstName = firstRow.querySelector('.name').textContent;
const firstLev = firstRow.querySelector('.shop-leverage').textContent;
console.log('   top shopping item =', firstName, '->', firstLev);
assert(/Pushbutton/.test(firstName), 'highest-leverage item (Pushbutton, +3) sorts first');
assert(/\+3/.test(firstLev), 'top item shows +3 leverage');

console.log('\n=== TEST 4: PWA service worker registration attempted (http context) ===');
assert(window.__swUrl === 'sw.js', 'service worker registered with sw.js over http');

console.log('\n=== TEST 5: toggling a part off recomputes ===');
const firstCb = doc.querySelector('#inventory-groups input[type=checkbox]:checked');
firstCb.checked = false;
firstCb.dispatchEvent(new window.Event('change'));
const after = doc.getElementById('owned-count').textContent;
console.log('   owned count after uncheck =', after);
assert(/6 parts owned/.test(after), 'unchecking drops count to 6 and recomputes (no crash)');

console.log('\n=== TEST 6 (v2): quantity stepper changes owned count ===');
assert(Array.from(doc.querySelectorAll('#inventory-groups .part')).some(r => /LED/.test(r.textContent)), 'an LED inventory row exists');
// Helpers that ALWAYS re-query the live DOM (renderInventoryNow replaces nodes on every change).
const ledRow = () => Array.from(doc.querySelectorAll('#inventory-groups .part')).find(x => /LED/.test(x.textContent));
const qtyOf = () => Number(ledRow().querySelector('.qtyval').textContent);
const cbOf = () => ledRow().querySelector('input[type=checkbox]');
const plusBtn = () => ledRow().querySelector('.qtybtn:last-child');
const minusBtn = () => ledRow().querySelector('.qtybtn:first-child');
const click = (node) => node.dispatchEvent(new window.Event('click', { bubbles: true }));

const start = qtyOf();
console.log('   LED qty before + =', start, '(sample inventory seeds led:1)');
const beforeTxt = doc.getElementById('owned-count').textContent;
click(plusBtn());
const afterTxt = doc.getElementById('owned-count').textContent;
console.log('   owned before/after LED + =', beforeTxt, '->', afterTxt);
assert(beforeTxt !== afterTxt, 'clicking + on a part increments owned count (qty model works)');
// REGRESSION: the qty <span> in the row must visibly update after the click.
console.log('   after +: qtyval =', qtyOf(), '| checkbox checked =', cbOf().checked, '| minus enabled =', !minusBtn().disabled);
assert(qtyOf() === start + 1, 'LED qty <span> increments by 1 after clicking + (regression: was stuck)');
assert(cbOf().checked === true, 'LED checkbox becomes/ stays checked after +');
assert(minusBtn().disabled === false, 'LED minus button enables once owned');
// second + -> +2 (re-query the button each time because the grid re-renders)
click(plusBtn());
assert(qtyOf() === start + 2, 'second + steps LED qty up by another 1');
// minus back down to 0 removes it: -1 -> start+1, -1 -> start, -1 -> 0
click(minusBtn());
assert(qtyOf() === start + 1, 'first minus steps back by 1');
click(minusBtn());
assert(qtyOf() === start, 'second minus returns to the seeded start qty');
click(minusBtn());
const at0 = qtyOf();
console.log('   after 3x minus: qtyval =', at0, '| checkbox checked =', cbOf().checked);
assert(at0 === 0, 'minus down to 0 removes the LED from owned');
assert(cbOf().checked === false, 'LED unchecked again at 0');

console.log('\n=== TEST 7 (v2): hash route opens detail view with wiring table ===');
window.location.hash = '#/project/weather_station';
window.dispatchEvent(new window.Event('hashchange'));
const detail = doc.getElementById('tab-detail');
assert(detail.querySelector('h2'), 'detail panel renders a project title');
assert(detail.querySelector('.pin-table'), 'detail view renders a wiring pin-table');
assert(detail.querySelector('.morelike'), 'detail view renders "More like this"');
const guide = detail.querySelector('.guide-link');
assert(guide && /guide/i.test(guide.textContent), 'detail view shows a clickable "Full assembly guide" link');
assert(detail.classList.contains('active'), 'detail panel becomes active on hash route');

console.log('\n=== TEST 8 (2A): difficulty + topic filters narrow the list ===');
// Reset to the full sample (earlier tests may have unchecked esp32).
doc.getElementById('btn-sample').click();
// Input: check "Advanced" only -> buildable cards should drop to 0 (sample has none).
const adv = doc.querySelector('.f-diff[value="Advanced"]');
adv.checked = true;
adv.dispatchEvent(new window.Event('change'));
const filteredBuild = doc.querySelectorAll('#buildable-list .card.buildable').length;
console.log('   buildable cards when Advanced-only =', filteredBuild);
assert(filteredBuild === 0, 'Advanced-only filter hides the beginner/intermediate sample buildables');
assert(/filtered/.test(doc.getElementById('projects-summary').textContent), 'summary shows a "filtered" note');
// Clear it.
doc.getElementById('f-clear').click();
assert(doc.querySelectorAll('#buildable-list .card.buildable').length === 6, 'Clear filters restores all 6 buildable');

console.log('\n=== TEST 9 (2A): topic filter keeps only matching projects ===');
const sel = doc.getElementById('f-topic');
sel.value = 'sensors';
sel.dispatchEvent(new window.Event('change'));
const sensorTitles = Array.from(doc.querySelectorAll('#buildable-list .card.buildable h3')).map(n => n.textContent);
console.log('   sensor-filtered buildables =', sensorTitles.join(' | '));
assert(sensorTitles.includes('Mini Weather Station'), 'sensors filter keeps weather_station (it is a sensors project)');
assert(!sensorTitles.some(t => /Blink/.test(t)), 'sensors filter drops non-sensor projects like Blink + Button');
doc.getElementById('f-clear').click();

console.log('\n=== TEST 10 (2A): offline "Surprise me" opens a project ===');
doc.getElementById('btn-surprise').click();
assert(/^#\/project\//.test(window.location.hash), 'Surprise me routes to a project detail via hash');
doc.getElementById('tab-projects').classList.add('active'); // back to projects for remaining tests
window.location.hash = '';

console.log('\n=== TEST 11 (2B): add a custom part and see it match ===');
// Add a custom part that supplies display-spi-tft (a CYD-like board).
doc.getElementById('custom-name').value = 'Mystery Board X';
doc.getElementById('custom-caps').value = 'mcu, mcu-wifi, display-spi-tft';
doc.getElementById('btn-custom-add').click();
const customRow = Array.from(doc.querySelectorAll('#inventory-groups .custom-part')).find(r => /Mystery Board X/.test(r.textContent));
assert(!!customRow, 'custom part appears in the inventory grid');
assert(/mcu, mcu-wifi, display-spi-tft/.test(customRow.textContent), 'custom part shows its caps');
// The TFT Dashboard needs display-spi-tft; before the custom part it was a near-miss.
// Recompute already ran; confirm it is now buildable (sample had no TFT before).
// Need sample loaded (it is from TEST 2). Go to projects + check.
const tftBuildable = Array.from(doc.querySelectorAll('#buildable-list .card.buildable h3')).some(n => /TFT Touch Dashboard/.test(n.textContent));
console.log('   TFT Touch Dashboard buildable after adding custom board =', tftBuildable);
assert(tftBuildable, 'adding a custom display-spi-tft part makes TFT Dashboard buildable');
// Remove it again.
const delBtn = customRow.querySelector('.qtybtn.del');
delBtn.dispatchEvent(new window.Event('click', { bubbles: true }));
assert(!Array.from(doc.querySelectorAll('#inventory-groups .custom-part')).some(r => /Mystery Board X/.test(r.textContent)), 'custom part removed on × click');

console.log('\n=== TEST 12 (2C): import round-trip restores inventory ===');
console.log('   (async import verified below with the final summary)');

console.log('\n=== TEST 13 (2D): Learning Paths tab renders + marks done steps ===');
doc.querySelector('.tab[data-tab="paths"]').click(); // showTab is private to app.js
const pathCards = doc.querySelectorAll('#learning-paths .card.path-card');
console.log('   learning path cards =', pathCards.length);
assert(pathCards.length === 6, 'all 6 curated learning paths render');
// With sample inventory, weather_station is buildable -> the sensors path should mark it done.
const sensorsPath = Array.from(pathCards).find(c => /Sense the World/.test(c.textContent));
const doneTags = sensorsPath ? sensorsPath.querySelectorAll('.path-tag.done').length : 0;
console.log('   "done" steps in Sense the World path =', doneTags);
assert(doneTags >= 1, 'Sense the World path marks at least one buildable step done (weather_station)');
assert(sensorsPath.querySelector('.path-link').getAttribute('href').startsWith('#/project/'), 'learning path steps link to project detail');

console.log('\n=== DONE ===');
// TEST 12 (2C) async import round-trip — run before printing final verdict.
// Reload the sample so the exported state is deterministic, then re-import it.
doc.getElementById('btn-sample').click();
const exported = window.localStorage.getItem('msm.inventory.v2'); // the app's live saved state
window.FileReader = class { readAsText() { this.result = exported; this.onload && this.onload(); } };
window.Inventory.importFromFile({ name: 'inv.json', size: exported.length }).then(s => {
  assert(s.owned && s.owned.esp32 === 1, 'import round-trip keeps esp32:1 from exported sample');
  if (process.exitCode) console.log('SOME TESTS FAILED'); else console.log('ALL DOM TESTS PASSED');
}).catch(e => { console.error('FAIL: import round-trip threw', e.message); process.exitCode = 1; console.log('SOME TESTS FAILED'); });

