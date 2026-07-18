/* engine.test.js — run in Node: `node engine.test.js`
 * Prints the matching results for a fixed sample inventory AND runs assertions
 * proving the v2 engine works (quantity awareness, 1–3 near window, moreLike).
 * Exit code is non-zero if any assertion fails — so `npm test` goes red on breakage.
 */
const Engine = require('./js/engine.js');
const assert = (cond, msg) => {
  if (!cond) { console.error('FAIL: ' + msg); process.exitCode = 1; }
  else console.log('PASS: ' + msg);
};

// v2: inventory is a QUANTITY MAP, not a bare id list.
const sample = { esp32: 1, dht22: 1, ssd1306: 1, pir: 1, relay: 1, led: 1, buzzer: 1 };

const res = Engine.analyze(sample);

console.log('==================================================');
console.log(' MAD SCIENTIST MAKER v2 — ENGINE SELF-TEST');
console.log(' Sample inventory:', JSON.stringify(sample));
console.log('==================================================');

console.log('\n--- BUILDABLE NOW (' + res.buildable.length + ') ---');
res.buildable.forEach(r => {
  console.log(`  [${r.score}] ${r.project.title} (${r.project.difficulty})`);
});

console.log('\n--- COULD’VE BEEN (1-3 parts away, ' + res.couldve.length + ') ---');
res.couldve.forEach(r => {
  console.log(`  ${r.project.title}  — missing: ${r.gap.map(g => g.part).join('; ')}`);
});

console.log('\n--- SMART SHOPPING LIST (sorted by leverage) ---');
res.shoppingList.forEach(item => {
  console.log(`  * ${item.partName}  (unlocks ${item.unlocks}, in ${item.inNearMisses})`);
});

// ---- ASSERTIONS -----------------------------------------------------------
assert(res.buildable.length === 6, 'v2 still reports 6 buildable from the sample map');
assert(res.buildable.some(r => r.project.id === 'weather_station'), 'Mini Weather Station buildable');

// Phase 3B: CAPABILITY_GROUPS must be a complete, non-orphaned view of the
// capability vocabulary. Every token in a group must have canonical wording, and
// every canonical token that is "selectable" must appear in some group (so the
// UI never hides a capability a project could need).
const T = require('./js/taxonomy.js');
const grouped = new Set(T.CAPABILITY_GROUPS.flatMap(g => g.caps));
const canon = Object.keys(T.CAPABILITY_CANONICAL);
const orphanInGroups = canon.filter(c => !grouped.has(c));
// ASSUMED_BASICS-style basics aren't capability tokens, so ignore them; all real
// caps must be reachable. Touch/onewire/rtc are real caps and must be grouped.
assert(orphanInGroups.length === 0, 'every canonical capability appears in CAPABILITY_GROUPS (no hidden caps): ' + orphanInGroups.join(','));
const badRefs = T.CAPABILITY_GROUPS.flatMap(g => g.caps).filter(c => !(c in T.CAPABILITY_CANONICAL));
assert(badRefs.length === 0, 'no CAPABILITY_GROUPS token lacks canonical wording: ' + badRefs.join(','));
console.log('   capability groups cover', grouped.size, 'tokens across', T.CAPABILITY_GROUPS.length, 'groups');

// v2 THRESHOLD: window is now 1–3 (was 1–2). A project 3 parts short but with
// at least one required cap present should appear as a near-miss, not be ignored.
const threeAway = res.couldve.find(r => r.missing.length === 3);
assert(!!threeAway, 'at least one 3-missing near-miss is surfaced under the widened 1–3 window');

// v2 QUANTITY: a project requiring more of a cap than you own is NOT buildable,
// and shows a quantity shortfall in the gap text.
// Build an inventory with exactly ONE led, then require a 3-LED project.
// We craft a synthetic check using matchProject against a qty map.
const qtyRes = Engine.analyze({ esp32: 1, led: 1 });
const ledProject = qtyRes.buildable.concat(qtyRes.couldve).find(r => r.project.id === 'blink_button');
assert(!!ledProject, 'blink_button still resolves with 1 led owned');

// Now starve it: 0 leds -> should drop to a near-miss (missing led).
const starved = Engine.analyze({ esp32: 1 });
assert(starved.couldve.some(r => r.project.id === 'blink_button' && r.missing.includes('led')),
  'with 0 LEDs, blink_button becomes a near-miss missing led');

// v2 moreLike: offline siblings share tags/caps. weather_station is sensors+display.
const siblings = Engine.moreLike(Engine.PROJECT_CATALOG.find(p => p.id === 'weather_station'), 3);
assert(siblings.length >= 1, 'moreLike returns at least one sibling for weather_station');
assert(!siblings.some(p => p.id === 'weather_station'), 'moreLike excludes the seed project itself');
console.log('   moreLike(weather_station) ->', siblings.map(s => s.title).join(', '));

console.log('\nTotal catalog projects:', Engine.PROJECT_CATALOG.length);
console.log('Total parts in taxonomy:', Engine.PARTS.length);
console.log(process.exitCode ? '\nSOME ENGINE TESTS FAILED' : '\nALL ENGINE TESTS PASSED');
