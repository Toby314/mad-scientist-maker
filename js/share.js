/*
 * Phase 5 Block 5 (share/sync) — export a build as memory-wiki markdown.
 * Produces a clean markdown block that drops into Toby's memory-wiki or ~/notes,
 * closing the loop with the personal chronicle. Offline, DOM-free, Node-testable.
 */
(function (root) {
  function escapeMd(s) {
    return String(s == null ? '' : s).replace(/([*_`#\[\]])/g, '\\$1');
  }

  /**
   * Build a memory-wiki-style markdown note for a project.
   * @param {object} p  a project from Engine.PROJECT_CATALOG
   * @param {Array<string>} [ownedIds]  so we can stamp which parts Toby owns
   * @returns {string} markdown
   */
  function projectMarkdown(p, ownedIds) {
    if (!p) return '';
    const owned = new Set(ownedIds || []);
    const capLabel = (cap) => (root.Taxonomy && root.Taxonomy.CAPABILITY_CANONICAL && root.Taxonomy.CAPABILITY_CANONICAL[cap]) || cap;
    const lines = [];
    lines.push('# ' + escapeMd(p.title));
    lines.push('');
    lines.push('> ' + escapeMd(p.blurb || ''));
    lines.push('');
    lines.push('**Difficulty:** ' + escapeMd(p.difficulty || '?') + '  ');
    lines.push('**Build time:** ' + escapeMd(p.buildTime || '?') + '  ');
    if (p.tags && p.tags.length) lines.push('**Tags:** ' + p.tags.map(escapeMd).join(', '));
    lines.push('');
    lines.push('## What it teaches');
    lines.push(escapeMd(p.why || ''));
    lines.push('');
    lines.push('## Parts needed');
    lines.push('');
    lines.push('| Capability | Part | Have |');
    lines.push('| --- | --- | --- |');
    (p.requiredCaps || []).forEach(cap => {
      const part = (root.Engine && root.Engine.PARTS.find(pt => (pt.caps || []).indexOf(cap) !== -1)) || null;
      const name = part ? part.name : capLabel(cap);
      const have = part ? (owned.has(part.id) ? '✅' : '❌') : '—';
      lines.push('| ' + escapeMd(capLabel(cap)) + ' | ' + escapeMd(name) + ' | ' + have + ' |');
    });
    if (p.optionalCaps && p.optionalCaps.length) {
      lines.push('');
      lines.push('_Optional:_ ' + p.optionalCaps.map(capLabel).map(escapeMd).join(', '));
    }
    if (p.steps && p.steps.length) {
      lines.push('');
      lines.push('## Steps');
      p.steps.forEach((s, i) => lines.push((i + 1) + '. ' + escapeMd(s)));
    }
    if (p.teach && p.teach.length) {
      lines.push('');
      lines.push('## Why each step');
      p.teach.forEach(t => lines.push('- ' + escapeMd(t)));
    }
    if (p.guideUrl) {
      lines.push('');
      lines.push('Full guide: ' + p.guideUrl);
    }
    lines.push('');
    lines.push('---');
    lines.push('_Exported from Mad Scientist Maker (offline)._');
    lines.push('');
    return lines.join('\n');
  }

  root.Share = { projectMarkdown };
})(window);
