# Phase 5 Competitive Research — Mad Scientist Maker

**Date:** 2026-07-18 · **Author:** Hermes (for Toby)

Toby asked two things:
1. Does `llm_wiki` have more features than the memory-wiki we already built?
2. Research the 6 tools he named as competitive reference points.

---

## 1) llm_wiki vs. our memory-wiki

**Our memory-wiki** (live at `http://192.168.1.242:8242/index.html`):
built by `~/.hermes/scripts/rebuild_memory_wiki.py`, which reads
`~/projects_index.md` + Toby's `~/notes/` journal and emits simple, linked
markdown pages. Append-only, no search engine, no graph, no external deps.
Private, local, secrets-redacted, tied to his personal chronicle + Hermes DB.

**llm_wiki** ([nashsu/llm_wiki](https://github.com/nashsu/llm_wiki), ~14.8k★):
an LLM-powered personal knowledge base built on **GitHub** using Langchain.
Feature set we do NOT have today:
- Desktop application (not just a web page)
- Ingest PDF / PPTX / DOCX / images with **multimodal vision captions**
- **MCP server** so other tools can query it
- **Graph view** of notes
- Automatic cross-referencing + contradiction linting
- Semantic search over embedded content

**Verdict: yes — llm_wiki has materially more features than our wiki.** But the
two solve different problems:
- *llm_wiki* = general "turn arbitrary documents into a smart wiki." Needs
  OpenAI/embeddings, cloud-leaning, broad.
- *our wiki* = a private, local, redaction-safe chronicle of Toby's own life /
  projects / Hermes state. Purpose-built, zero external dependencies, runs on
  the LAN box.

**Recommendation:** keep our wiki as-is (it fits the privacy/offline rule), but
**borrow ideas** for MSM Phase 5 — specifically the graph view (Block 3) and the
"explain/teach" layer (Block 1). We do NOT need to adopt llm_wiki itself.

---

## 2) The 6-tool scan → what they add, what we lack

| Tool | What it is | Gap it exposes in MSM |
|------|-----------|-----------------------|
| **kicad-happy** (aklofas) | KiCad *agent skills*: schematic / PCB / EMC / SPICE review | MSM has zero PCB/schematic assist |
| **turbovec** (Rust) | Vector index (TurboQuant) for semantic similarity search | MSM match is deterministic only; no fuzzy/semantic |
| **ponytail** (DietrichGebert) | AI coding-agent **skill** that forces "why-first" justification before building (NOT hair styling) | MSM shows need/owned but no explicit *rationale* layer |
| **labs/graphify** | Folder → knowledge graph (code, docs, PDF, images, video) you can query/trace | MSM has no parts↔projects↔sketches graph |
| **Hermes Studio / Desktop** | Packaged agent app, sub-agents, image gen | MSM is web-only; no desktop shell / agent-MCP hook |
| **llm_wiki** | LLM doc→wiki (see §1) | No doc/datasheet ingest, no graph, no MCP |

---

## 3) How this maps to Phase 5 blocks (`plans/phase5.md`)

- **Block 1 — "Why it fits" reasoning + teach-me** ← ponytail principle + Toby's
  standing "teach me WHY" preference. Highest value, no new deps.
- **Block 2 — Semantic / fuzzy search** ← turbovec lesson (augments, doesn't
  replace, the deterministic matcher).
- **Block 3 — Datasheet/PDF import + knowledge graph** ← labs/graphify + llm_wiki
  graph-view lesson.
- **Block 4 — PCB / BOM assist** ← kicad-happy lesson (BOM→netlist stub, starter
  schematic patterns for CYD builds).
- **Block 5 — Desktop / MCP packaging** ← Hermes Studio + llm_wiki lesson
  (PWA is already done in Phase 4; add optional Tauri/Electron shell + an MCP
  server so the Hermes agent can query MSM directly, and a one-click "export
  build" into Toby's memory-wiki).

**Rollout order:** 1 → 2 → 3 → 4 → 5. Block 1 first (pure value, no deps, serves
the teaching requirement). Block 5 last (wrap solid features in a shell/MCP).

---

## 4) Parked (Toby said "another time")
- "Caveman" app idea
- "Robot vacuum" app idea
