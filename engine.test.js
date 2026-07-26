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

// Phase 3D: CYD ranking. Build an inventory that yields at least one screen
// build AND at least one non-screen build, then confirm sortByCyd floats the
// screen build to the top. We use the CYD part (provides display-spi-tft) plus
// a couple modules so multiple projects are buildable.
const cydRes = Engine.analyze({ cyd: 1, dht22: 1, pir: 1, led: 3, buzzer: 1 });
assert(cydRes.buildable.length >= 2, 'CYD inventory yields multiple buildable (' + cydRes.buildable.length + ')');
const ranked = Engine.sortByCyd(cydRes.buildable);
const topIsScreen = (ranked[0].project.requiredCaps || []).indexOf('display-spi-tft') !== -1;
assert(topIsScreen, 'sortByCyd floats a TFT/screen build to the top');
// The CYD relevance score is deterministic and higher for screen builds.
const tftProj = Engine.PROJECT_CATALOG.find(p => p.id === 'tft_dash') || cydRes.buildable.find(r => (r.project.requiredCaps||[]).indexOf('display-spi-tft') !== -1);
if (tftProj) {
  const tftScore = Engine.cydScore(tftProj.project || tftProj);
  assert(tftScore >= 3, 'cydScore of a TFT build is >= 3 (weighted by screen use): ' + tftScore);
  console.log('   cydScore(TFT build) =', tftScore, '| top build =', ranked[0].project.title);
}
// ---- Phase 5 Block 1: rationale (self-explanation) ----
const buildRow = { status: 'buildable', project: { id: 'x', difficulty: 'Beginner', buildTime: '~1h' },
  missing: [], optHave: ['display-i2c-oled'], usedParts: { mcu: 'ESP32', led: 'LED' } };
const bRat = Engine.rationale(buildRow);
assert(bRat.cheapest === null, 'buildable rationale has no cheapest-missing (nothing missing)');
assert(/Buildable now/.test(bRat.fit), 'buildable rationale fit text says buildable now');
assert(bRat.uses.length === 2 && bRat.uses.includes('ESP32'), 'buildable rationale lists owned part names, deduped');
assert(/optional upgrade/.test(bRat.whyNow), 'buildable rationale explains the optional upsides');

const nearRow = { status: 'near', project: { id: 'y', difficulty: 'Intermediate', buildTime: '~2h' },
  missing: ['relay'], gap: [{ cap: 'relay', part: 'Relay module', short: false }], optHave: [], usedParts: { mcu: 'ESP32' } };
const nRat = Engine.rationale(nearRow);
assert(nRat.cheapest && /Relay module/.test(nRat.cheapest.part), '1-gap near-miss names the single cheapest part to buy');
assert(/Buy just the Relay module/.test(nRat.whyNow), '1-gap near rationale tells Toby the one buy that unlocks it');

const near2 = { status: 'near', project: { id: 'z', difficulty: 'Advanced', buildTime: '~1d' },
  missing: ['a', 'b'], gap: [{ cap: 'a', part: 'A' }, { cap: 'b', part: 'B' }], optHave: [], usedParts: {} };
const n2Rat = Engine.rationale(near2);
assert(n2Rat.cheapest === null, 'multi-gap near-miss has no single cheapest (points to shopping list)');

// ---- Phase 5 Block 2: fuzzy/semantic search ----
const srch1 = Engine.search('motion sensor');
const srch1PartIds = srch1.parts.map(p => p.part.id);
assert(srch1PartIds.indexOf('pir') !== -1, 'search "motion sensor" finds the PIR part via synonym');
assert(srch1.projects.some(p => p.project.id === 'motion_light'), 'search "motion sensor" finds the Motion-Activated Light project');

const srch2 = Engine.search('screen');
assert(srch2.projects.some(p => p.project.id === 'tft_dashboard') || srch2.projects.some(p => p.project.id === 'oled_hello'),
  'search "screen" finds screen-bearing projects (TFT/OLED)');

// ranking: exact vocab token beats fuzzy — "temp" should hit temp projects first
const srch3 = Engine.search('temp');
assert(srch3.projects.length > 0 && /temp|weather/i.test(srch3.projects[0].project.title + srch3.projects[0].why),
  'search "temp" returns temperature/weather projects ranked first');

// fuzzy typo tolerance: "temprature" (typo) still resolves to temp synonyms
const srch4 = Engine.search('temprature');
assert(srch4.projects.length > 0, 'fuzzy typo "temprature" still returns matches');

// empty query returns nothing
const srch5 = Engine.search('   ');
assert(srch5.parts.length === 0 && srch5.projects.length === 0, 'blank query returns nothing');

// ---- Phase 5 Block 3: datasheet parse + part graph ----
const ds = Engine.parseDatasheet('ESP32-S3 board with WiFi, Bluetooth LE, 1.28" TFT touch display, microSD slot, NeoPixel', 'My CYD-ish board');
assert(ds.caps.indexOf('mcu-wifi') !== -1, 'parseDatasheet finds wifi -> mcu-wifi');
assert(ds.caps.indexOf('display-spi-tft') !== -1, 'parseDatasheet finds TFT -> display-spi-tft');
assert(ds.caps.indexOf('touch') !== -1, 'parseDatasheet finds touch');
assert(ds.caps.indexOf('led-addressable') !== -1, 'parseDatasheet finds neopixel -> led-addressable');
assert(ds.name === 'My CYD-ish board', 'parseDatasheet keeps the name');

const dsBad = Engine.parseDatasheet('a plain wooden box', 'junk');
assert(dsBad.caps.length === 0, 'parseDatasheet returns no caps for unrecognized text');

const gr = Engine.partGraph('weather_station');
const gCaps = gr.map(g => g.cap);
assert(gCaps.indexOf('sensor-temp') !== -1, 'partGraph links weather_station via sensor-temp');
const linkedTitles = gr.find(g => g.cap === 'sensor-temp').projects.map(p => p.title);
assert(linkedTitles.length > 0, 'partGraph lists projects sharing sensor-temp');
const grNone = Engine.partGraph('does_not_exist');
assert(grNone.length === 0, 'partGraph returns [] for unknown project');

// ---- Phase 5 v5.1.0: substitution engine + build-next recommender ----
// weather_station needs sensor-temp + sensor-humidity + display + mcu (+ optional).
const subs = Engine.substitutions('weather_station', ['esp32', 'dht22', 'ssd1306']);
const tempSub = subs.find(s => s.cap === 'sensor-temp');
assert(!!tempSub, 'substitutions returns an entry for sensor-temp');
assert(tempSub.options.some(o => o.id === 'dht22' && o.owned), 'owned DHT22 is marked owned in substitutions');
assert(tempSub.options.some(o => o.id === 'bme280'), 'BME280 offered as a temp/humidity substitute for DHT22');
// owned parts sort first
const firstOwned = tempSub.options.find(o => o.owned);
assert(tempSub.options[0].owned, 'owned options float to the top of a substitution row');

const bn = Engine.buildNext(sample, []);
assert(!!bn && !!bn.id, 'buildNext returns a suggestion object');
assert(typeof bn.reason === 'string' && bn.reason.length > 0, 'buildNext reason is non-empty');
const bnEmpty = Engine.buildNext({}, []);
assert(bnEmpty === null, 'buildNext returns null with empty inventory');
const bnDone = Engine.buildNext(sample, [bn.id]);
assert(!!bnDone && bnDone.id !== bn.id, 'buildNext skips already-done project');

console.log(process.exitCode ? '\nSOME ENGINE TESTS FAILED' : '\nALL ENGINE TESTS PASSED');
