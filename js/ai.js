/* =============================================================================
 * ai.js  —  OPTIONAL AI SUGGESTIONS (graceful, offline-safe)
 * -----------------------------------------------------------------------------
 * WHY THIS IS OPTIONAL AND SEPARATE
 * The curated catalog (catalog.js + engine.js) is the reliable, always-offline
 * brain. AI is a BONUS layer: if the user adds an endpoint + key (stored ONLY
 * in localStorage on their device), we can call an OpenAI-compatible
 * chat-completions API to invent fresh ideas from their inventory. If there is
 * no key, every function here degrades gracefully — the app never breaks and
 * never phones home.
 *
 * Security note: the key lives in localStorage and is sent ONLY to the endpoint
 * the user types. We never hardcode a key and never transmit it anywhere else.
 * ===========================================================================*/

(function (root) {
  const KEY_SETTINGS = 'msm.ai.v1';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(KEY_SETTINGS);
      return raw ? JSON.parse(raw) : { endpoint: '', key: '', model: '' };
    } catch { return { endpoint: '', key: '', model: '' }; }
  }

  function saveSettings(s) {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(s));
  }

  function hasKey() {
    const s = loadSettings();
    return !!(s.endpoint && s.key);
  }

  /**
   * Call the LLM to generate project ideas.
   * @param {string[]} capNames  friendly names of the user's owned parts
   * @param {string}   mode      'surprise' | 'morelike:<title>'
   * @returns {Promise<Array>}   array of idea objects {title, blurb, why, steps[]}
   */
  async function suggest(capNames, mode) {
    const s = loadSettings();
    if (!s.endpoint || !s.key) throw new Error('No AI key configured.');

    const capsLine = capNames.length
      ? capNames.join(', ')
      : 'essentials only (a microcontroller, breadboard, wires)';

    let instruction;
    if (mode === 'surprise') {
      instruction = `Invent 3 ORIGINAL, beginner/intermediate-friendly electronics projects ` +
        `a maker could build using ONLY some of these owned parts: ${capsLine}. ` +
        `Prefer projects that need at most 1-2 extra cheap parts.`;
    } else {
      // "more like <title>" — we pass the title via mode string.
      const base = mode.replace('morelike:', '');
      instruction = `Suggest 3 projects SIMILAR in spirit to "${base}" that this maker could ` +
        `build or adapt using these owned parts: ${capsLine}. Keep them concrete and beginner-friendly.`;
    }

    const system = `You are a friendly electronics mentor for new makers. For each project reply ` +
      `with strict JSON (no prose, no markdown fences) as an array of objects: ` +
      `{ "title": string, "blurb": string (one line what it does), ` +
      `"why": string (what they'll learn), "steps": string[3-5] (high-level wiring/build outline) }. ` +
      `Make ideas real and buildable.`;

    const body = {
      model: s.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: instruction },
      ],
      temperature: 0.8,
    };

    const res = await fetch(s.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + s.key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('AI request failed (' + res.status + '). Check endpoint/key.');
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '[]';
    // The model is told to return bare JSON; strip accidental code fences if any.
    const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  }

  root.AI = { loadSettings, saveSettings, hasKey, suggest };
})(window);
