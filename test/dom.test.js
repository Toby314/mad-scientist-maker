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
['js/taxonomy.js', 'js/catalog.js', 'js/engine.js', 'js/inventory.js', 'js/ai.js', 'js/ui.js', 'js/app.js']
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
assert(nearCards.length === 4, 'shows 4 near-miss cards (spec: 2-4)');
assert(/7 parts owned/.test(ownedTxt), 'owned-count reads 7');

const titles = Array.from(buildCards).map(c => c.querySelector('h3').textContent);
console.log('   buildable titles:', titles.join(' | '));
assert(titles.includes('Mini Weather Station'), 'Mini Weather Station is buildable');
assert(doc.querySelector('#buildable-list .why'), 'buildable card has a WHY/teaching block');
assert(doc.querySelector('#buildable-list .steps li'), 'buildable card has numbered steps');
assert(doc.querySelector('#buildable-list .chip.uses'), 'buildable card lists "Uses your" parts');

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

console.log('\n=== DONE ===');
if (process.exitCode) console.log('SOME TESTS FAILED'); else console.log('ALL DOM TESTS PASSED');
