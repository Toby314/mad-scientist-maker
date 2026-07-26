/*
 * mcp/server.test.js — proves the Block 5 MCP server answers tool calls over
 * stdio using the MCP JSON-RPC handshake. Spawns the server, drives it, exits
 * non-zero on any failure. Offline, no network.
 */
const { spawn } = require('child_process');
const path = require('path');

const server = path.resolve(__dirname, 'server.js');
const child = spawn('node', [server], { stdio: ['pipe', 'pipe', 'pipe'] });

let buf = '';
let tests = 0, fails = 0;
const pending = [];
function rpc(method, params, expectFn) {
  const id = pending.length + 1;
  pending[id] = expectFn;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
}

child.stdout.on('data', d => {
  buf += d.toString();
  let i;
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    let msg; try { msg = JSON.parse(line); } catch (e) { continue; }
    if (msg.id != null && pending[msg.id]) {
      const fn = pending[msg.id]; pending[msg.id] = null;
      try { fn(msg); tests++; }
      catch (e) { fails++; console.error('FAIL:', e.message); }
    }
  }
});

function done() {
  child.kill();
  if (fails === 0) { console.log('ALL MCP TESTS PASSED (' + tests + ')'); process.exit(0); }
  else { console.error(fails + ' MCP TEST(S) FAILED'); process.exit(1); }
}

child.stderr.on('data', e => process.stderr.write('[server stderr] ' + e));

// Give the server a moment to load the engine, then run the handshake + calls.
setTimeout(() => {
  rpc('initialize', {}, (m) => {
    if (m.error) throw new Error('initialize errored: ' + JSON.stringify(m.error));
    if (!m.result || !m.result.serverInfo || m.result.serverInfo.name !== 'mad-scientist-maker')
      throw new Error('initialize did not return expected serverInfo');
  });
  rpc('tools/list', {}, (m) => {
    const names = (m.result.tools || []).map(t => t.name);
    ['msm_recommend', 'msm_catalog', 'msm_substitutions', 'msm_parts_graph'].forEach(n => {
      if (names.indexOf(n) === -1) throw new Error('missing tool: ' + n);
    });
  });
  rpc('tools/call', { name: 'msm_recommend', arguments: { owned: { esp32: 1, dht22: 1, ssd1306: 1 } } }, (m) => {
    if (m.error) throw new Error('msm_recommend errored: ' + JSON.stringify(m.error));
    const txt = m.result.content[0].text;
    const obj = JSON.parse(txt);
    if (!Array.isArray(obj.buildable)) throw new Error('msm_recommend: no buildable array');
  });
  rpc('tools/call', { name: 'msm_substitutions', arguments: { projectId: 'weather_station', owned: ['esp32', 'dht22'] } }, (m) => {
    if (m.error) throw new Error('msm_substitutions errored');
    const subs = JSON.parse(m.result.content[0].text);
    if (!subs.some(s => s.cap === 'sensor-temp')) throw new Error('msm_substitutions: no sensor-temp row');
  });
  rpc('tools/call', { name: 'msm_parts_graph', arguments: { projectId: 'weather_station' } }, (m) => {
    if (m.error) throw new Error('msm_parts_graph errored');
    const g = JSON.parse(m.result.content[0].text);
    if (!Array.isArray(g)) throw new Error('msm_parts_graph: not an array');
  });
  // after the last call, give a tick then finish
  setTimeout(done, 300);
}, 400);
