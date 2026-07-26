// dom_smoke_block3.js — proves Phase 5 Block 3 (datasheet scan + part graph).
// Run: node dom_smoke_block3.js   (jsdom required: npm i jsdom)
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
  // 1) datasheet scan ticks caps in the custom-part checklist
  const ta = window.document.getElementById('sheet-text');
  const scanBtn = window.document.getElementById('btn-sheet-scan');
  if (!ta || !scanBtn) { console.log('FAIL: no datasheet UI'); process.exitCode = 1; return; }
  ta.value = 'ESP32-S3 with WiFi, Bluetooth LE, 1.28" TFT touch display, microSD slot, NeoPixel';
  scanBtn.dispatchEvent(new window.Event('click'));
  const ticked = window.document.querySelectorAll('#custom-caps-grid .cap-check:checked').length;
  console.log('datasheet scan -> caps ticked:', ticked, '| ok:', ticked >= 3);

  // 2) part graph renders on a project detail view
  const Detail = window.Detail;
  const panel = window.document.getElementById('tab-detail');
  window.scrollTo = () => {}; // jsdom has no scrollTo; the real browser does
  Detail.show('weather_station');
  const graphHtml = panel.textContent || '';
  const hasGraph = /What else uses these parts/.test(graphHtml) && /Temp sensor/.test(graphHtml);
  console.log('project graph rendered:', hasGraph);

  const okAll = ticked >= 3 && hasGraph;
  console.log(okAll ? 'BLOCK3_DOM_OK' : 'BLOCK3_DOM_FAIL');
  process.exitCode = okAll ? 0 : 1;
}, 300);
