/* engine.test.js — run in Node: `node engine.test.js`
 * Prints the matching results for a fixed sample inventory so we can PROVE the
 * engine works (buildable / could've-been / shopping list) without a browser.
 */
const Engine = require('./js/engine.js');

// The spec example inventory: esp32, dht22, ssd1306, pir, relay, led, buzzer
const sample = ['esp32', 'dht22', 'ssd1306', 'pir', 'relay', 'led', 'buzzer'];

const res = Engine.analyze(sample);

console.log('==================================================');
console.log(' MAD SCIENTIST MAKER — ENGINE SELF-TEST');
console.log(' Sample inventory:', sample.join(', '));
console.log('==================================================');

console.log('\n--- BUILDABLE NOW (' + res.buildable.length + ') ---');
res.buildable.forEach(r => {
  console.log(`  [${r.score}] ${r.project.title} (${r.project.difficulty})`);
  console.log(`        uses: ${Object.values(r.usedParts).join(', ')}`);
});

console.log('\n--- COULD\'VE BEEN (1-2 parts away, ' + res.couldve.length + ') ---');
res.couldve.forEach(r => {
  console.log(`  ${r.project.title}  — missing: ${r.gap.map(g => g.part).join('; ')}`);
});

console.log('\n--- SMART SHOPPING LIST (sorted by leverage) ---');
res.shoppingList.forEach(item => {
  console.log(`  * ${item.partName}`);
  console.log(`      unlocks ${item.unlocks} project(s); in ${item.inNearMisses} near-miss(es): ${item.projects.join(', ')}`);
});

console.log('\nTotal catalog projects:', Engine.PROJECT_CATALOG.length);
console.log('Total parts in taxonomy:', Engine.PARTS.length);
console.log('DONE.');
