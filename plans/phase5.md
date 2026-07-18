# Mad Scientist Maker — Phase 5 Plan

**Goal:** Close the feature gaps the competitive scan exposed, in independently
shippable blocks. Each block is a vertical slice: code + DOM/engine tests +
short docs. Deterministic, parts-driven matching (Phase 1–4) stays the core;
everything below *augments* it.

**Competitive scan (what they have that we don't):**
| Tool | What it adds | Our gap today |
|------|--------------|---------------|
| llm_wiki (14.8k★) | Desktop app, PDF/PPTX/DOCX/image ingest, multimodal vision captions, MCP server, graph view, auto cross-ref + contradiction lint | No doc/datasheet ingest, no graph, no MCP, web-only |
| labs/graphify | Folder → knowledge graph (code, docs, PDF, images, video) you query/trace | No knowledge graph of parts↔projects↔sketches |
| kicad-happy | KiCad agent skills: schematic/PCB/EMC/SPICE review | No PCB/schematic assist at all |
| turbovec | Rust vector index (TurboQuant) for semantic similarity | Match is deterministic only; no fuzzy/semantic search |
| ponytail | "Why-first" method: force the agent to justify before building | We show need/owned, but no explicit *rationale* layer |
| Hermes Studio/Desktop | Packaged agent app, sub-agents, image gen | We're a web app; no desktop bundle / agent-MCP hook |

---

## Block 1 — "Why it fits" reasoning + teaching layer  *(ponytail principle + Toby's teaching preference)*
The single highest-value block. Every recommendation must *explain itself*.
- **Rationale object** from the engine: for each buildable project, list (a) which
  owned parts satisfy which needs, (b) what's missing and cheapest source,
  (c) skill level + est. time/cost, (d) one-line "why this fits your bench now".
- **Teach-me mode**: each build step expands with the *why* (e.g. "solder the
  power jack first so you don't cook the MCU", "pull-up resistor because I2C
  needs it", "CYD chosen because it bundles display+SD").
- **Difficulty ladder**: Beginner / Intermediate / Advanced tags + prerequisites.
- Tests: engine returns a structured `rationale`; DOM renders rationale + teach-me
  toggles; ladder filters correctly.

## Block 2 — Semantic & fuzzy search  *(turbovec lesson)*
- Synonym/fuzzy part & project search ("motion sensor" → GY-91 / MPU-6050 /
  BMI160; "screen" → CYD). Keeps deterministic match as the source of truth;
  semantic is an *augmentation* ranking on top.
- Optional: lightweight local vector index (tiny Ollama embeddings) for
  "projects like this one" — behind a flag, off by default, no cloud.
- Tests: fuzzy query returns synonym parts; ranking puts exact matches first.

## Block 3 — Datasheet / PDF import + knowledge graph  *(labs/graphify + kicad-happy)*
- **Import**: paste a part number or drop a datasheet PDF → extract pins /
  capabilities / typical circuits → create a custom catalog part automatically.
- **Graph view**: local, no-cloud visualization of parts ↔ projects ↔ sketches
  (what you can build from what you own; how parts connect). Reuses the taxonomy.
- Tests: PDF parse yields a valid catalog entry; graph renders nodes/edges from
  owned inventory.

## Block 4 — PCB / schematic assist  *(kicad-happy lesson)*
- **BOM → netlist/schematic stub** export for a build (so Toby can open it in
  KiCad). Minimal, valid, editable.
- **"Design your own board" starter**: given selected parts, suggest a minimal
  schematic pattern (CYD breakout, power reg, headers) as a starting point.
- Optional hook to run kicad-happy-style review on an exported project.
- Tests: BOM export produces a parseable netlist; starter pattern is valid.

## Block 5 — Packaging & ecosystem  *(llm_wiki / Hermes Studio lesson)*
- **Desktop/PWA bundle**: Phase 4 already made it installable + offline. Add a
  one-command LAN installer and (optional) a Tauri/Electron desktop wrapper so it
  lives next to llm_wiki on the shelf.
- **MCP server**: expose `recommend(parts)`, `catalog_lookup`, `parts_graph` as
  MCP tools so the Hermes agent (and others) can query MSM directly.
- **Share / sync**: "Export build" → markdown that drops into Toby's memory-wiki
  or `~/notes`, closing the loop with the personal chronicle we already built.
- Tests: MCP server answers a tool call over stdio; markdown export matches the
  memory-wiki schema.

---

## Rollout order & rationale
1 → 2 → 3 → 4 → 5. Block 1 is pure value with no new dependencies and directly
serves the "teach me why" requirement. Block 2 is a small add-on to the existing
engine. Block 3 adds the biggest *new* capability (ingest + graph). Block 4 is
for when Toby starts etching his own boards. Block 5 is packaging — do it last so
the features above are solid before we wrap them in a desktop shell / MCP.

## Definition of done (per block)
- Code + DOM + engine tests green (same bar as Phase 4).
- `offline_check.py` still passes (no new uncached load-bearing assets).
- A 2–3 line "why" note committed with the block.
