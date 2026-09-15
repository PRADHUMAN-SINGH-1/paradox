(() => {
  const root = document.querySelector<HTMLElement>('.studio');
  if (!root) return;

  const routerPrefix = '/functions/v1/ai-router';
  const originalFetch = window.fetch.bind(window);

  /* Improve every Studio request without exposing or changing provider credentials. */
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString();
    if (!url.includes(routerPrefix) || !init?.body || typeof init.body !== 'string') {
      return originalFetch(input, init);
    }
    try {
      const payload = JSON.parse(init.body);
      const qualityLayer = `\n\nQUALITY REQUIREMENTS:\n- Tailor the response directly to the supplied inputs; do not produce a generic template.\n- Use clear section headings and concise bullets where they improve scanning.\n- Prioritize concrete, actionable edits or decisions over filler.\n- Never invent facts, credentials, experience, metrics, sources, APIs, or citations.\n- Preserve user-provided facts exactly unless you explicitly label a suggested rewrite.\n- State assumptions or uncertainty briefly when the input is insufficient.\n- For code, preserve unrelated behavior and show the smallest safe correction before optional improvements.\n- End with a short NEXT STEPS section when the task benefits from one.`;
      payload.prompt = `${payload.prompt || ''}${qualityLayer}`;
      payload.system = `${payload.system || ''} Return polished, production-useful output with strong information hierarchy. Avoid repetitive introductions, fake enthusiasm and vague advice.`;
      return originalFetch(input, { ...init, body: JSON.stringify(payload) });
    } catch {
      return originalFetch(input, init);
    }
  };

  const result = root.querySelector<HTMLElement>('#result');
  const resultTop = root.querySelector<HTMLElement>('.result-top');
  const run = root.querySelector<HTMLButtonElement>('#run');
  if (!result || !resultTop || !run) return;

  let meta = root.querySelector<HTMLElement>('.studio-result-meta');
  if (!meta) {
    meta = document.createElement('div');
    meta.className = 'studio-result-meta';
    resultTop.appendChild(meta);
  }

  let rerun = root.querySelector<HTMLButtonElement>('#rerun');
  if (!rerun) {
    rerun = document.createElement('button');
    rerun.id = 'rerun';
    rerun.type = 'button';
    rerun.className = 'mini';
    rerun.textContent = 'RUN AGAIN';
    rerun.addEventListener('click', () => run.click());
    resultTop.appendChild(rerun);
  }

  const updateMeta = () => {
    if (!meta) return;
    const text = result.textContent?.trim() || '';
    if (!text || text === 'Generating…') {
      meta.textContent = '';
      return;
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    const lines = text.split(/\r?\n/).length;
    meta.textContent = `${words.toLocaleString()} words · ${lines} lines`;
  };

  const observer = new MutationObserver(updateMeta);
  observer.observe(result, { childList: true, characterData: true, subtree: true });
  updateMeta();
})();
