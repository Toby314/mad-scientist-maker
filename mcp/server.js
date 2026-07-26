#!/usr/bin/env node
/*
 * Mad Scientist Maker — MCP server (Phase 5 Block 5: Packaging & ecosystem).
 *
 * Exposes the recommender engine to any MCP client (Hermes agent, Claude Desktop,
 * etc.) over stdio using the Model Context Protocol JSON-RPC handshake.
 *
 * DESIGN:
 *  - Zero dependencies. Uses only Node built-ins (readline, vm, fs, path).
 *  - Loads the browser engine by evaluating the project's JS files inside a
 *    minimal `window` shim, so the SAME matching logic runs in Node and the PWA.
 *  - Fully offline. No network, no API key. The agent queries MSM directly.
 *
 * Run:  node mcp/server.js
 * Wire into an MCP client with:  { "command": "node", "args": ["/abs/path/mcp/server.js"] }
 *
 * Tools:
 *  - msm_recommend   { owned: {partId:qty} }            -> buildable / near / shopping
 *  - msm_catalog     { query?:string, id?:string }       -> part or project lookup
 *  - msm_substitutions { projectId, owned?: string[] }   -> alternative parts per cap
 *  - msm_parts_graph { projectId }                       -> projects sharing this project's caps
 */

'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- load the engine into a fake browser `window` -------------------------
const root = path.resolve(__dirname, '..');
const win = {};
win.window = win;
const vm = require('vm');
const ctx = vm.createContext(win);
['js/taxonomy.js', 'js/catalog.js', 'js/engine.js'].forEach(f => {
  const code = fs.readFileSync(path.join(root, f), 'utf8');
  vm.runInContext(code, ctx, { filename: f });
});
const Engine = win.Engine;

// --- MCP primitives --------------------------------------------------------
let nextId = 1;
const TOOLS = [
  {
    name: 'msm_recommend',
    description: 'Recommend ESP32/Arduino projects from the parts the user owns. Returns buildable-now, near-misses (1-3 parts away), and a shopping list.',
    inputSchema: {
      type: 'object',
      properties: {
        owned: {
          type: 'object',
          description: 'Map of owned part id -> quantity, e.g. {"esp32":1,"dht22":1}. Use part ids from msm_catalog.',
          additionalProperties: { type: 'number' },
        },
      },
      required: ['owned'],
    },
  },
  {
    name: 'msm_catalog',
    description: 'Look up a part or project in the MSM catalog by id, or search by free text.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Exact part id (e.g. "esp32") or project id (e.g. "weather_station").' },
        query: { type: 'string', description: 'Free-text search across parts and projects (synonyms + fuzzy).' },
      },
    },
  },
  {
    name: 'msm_substitutions',
    description: 'For a given project, list every catalog part that can satisfy each required capability, and which the user already owns. Answers "I dont have a DHT22 — what else works?".',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id, e.g. "weather_station".' },
        owned: { type: 'array', items: { type: 'string' }, description: 'Optional owned part ids to mark which substitutes the user has.' },
      },
      required: ['projectId'],
    },
  },
  {
    name: 'msm_parts_graph',
    description: 'Given a project, return the other catalog projects that share its capabilities ("what else can I build with these parts?").',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string', description: 'Project id.' },
      },
      required: ['projectId'],
    },
  },
];

function toolResult(obj) {
  return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] };
}

function callTool(name, args) {
  args = args || {};
  switch (name) {
    case 'msm_recommend': {
      const owned = args.owned || {};
      const res = Engine.analyze(owned, []);
      return toolResult({
        buildable: res.buildable.map(r => ({ id: r.project.id, title: r.project.title, difficulty: r.project.difficulty })),
        nearMisses: res.couldve.slice(0, 8).map(r => ({
          id: r.project.id, title: r.project.title,
          missing: (r.missing || []).map(m => Engine.PARTS.find(p => p.id === m.partId) ? Engine.PARTS.find(p => p.id === m.partId).name : m.cap),
        })),
        shoppingList: res.shoppingList,
      });
    }
    case 'msm_catalog': {
      if (args.id) {
        const part = Engine.PARTS.find(p => p.id === args.id);
        const proj = Engine.PROJECT_CATALOG.find(p => p.id === args.id);
        return toolResult({ part: part || null, project: proj || null });
      }
      const q = Engine.search(args.query || '');
      return toolResult({
        parts: q.parts.slice(0, 10).map(h => ({ id: h.part.id, name: h.part.name })),
        projects: q.projects.slice(0, 10).map(h => ({ id: h.project.id, title: h.project.title })),
      });
    }
    case 'msm_substitutions': {
      const owned = args.owned || [];
      const subs = Engine.substitutions(args.projectId, owned);
      return toolResult(subs);
    }
    case 'msm_parts_graph': {
      const g = Engine.partGraph(args.projectId);
      return toolResult(g);
    }
    default:
      throw new Error('unknown tool: ' + name);
  }
}

// --- JSON-RPC over stdio ---------------------------------------------------
const rl = readline.createInterface({ input: process.stdin, terminal: false });
let buf = '';
rl.on('line', line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { return; }
  handle(msg);
});

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function handle(msg) {
  if (msg.jsonrpc !== '2.0') return;
  if (msg.method === 'initialize') {
    send({
      jsonrpc: '2.0', id: msg.id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'mad-scientist-maker', version: '5.1.0' },
      },
    });
    return;
  }
  if (msg.method === 'notifications/initialized') return;
  if (msg.method === 'tools/list') {
    send({ jsonrpc: '2.0', id: msg.id, result: { tools: TOOLS } });
    return;
  }
  if (msg.method === 'tools/call') {
    try {
      const result = callTool(msg.params.name, msg.params.arguments || {});
      send({ jsonrpc: '2.0', id: msg.id, result });
    } catch (e) {
      send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: String(e.message || e) } });
    }
    return;
  }
  // unknown method
  send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: 'method not found: ' + msg.method } });
}

if (require.main === module) {
  // keep process alive; stdin drives it
}
