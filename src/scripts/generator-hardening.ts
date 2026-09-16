function hardenBracket() {
  const root = document.querySelector<HTMLElement>('.generator-page[data-mode="bracket"]') as (HTMLElement & { _roundWinners?: Array<string | null> }) | null;
  if (!root) return;
  const grid = root.querySelector('.bracket-grid');
  if (!grid || !root._roundWinners) return;
  const matches = Array.from(grid.querySelectorAll<HTMLElement>('.bracket-match'));
  const picks = matches.map((match) => Array.from(match.querySelectorAll<HTMLButtonElement>('.bracket-pick')));
  let changed = false;
  picks.forEach((buttons, index) => {
    if (buttons.length !== 2) return;
    const labels = buttons.map((button) => button.textContent?.trim() || '');
    if (labels[0] === 'BYE' && labels[1] === 'BYE' && root._roundWinners?.[index] == null) {
      root._roundWinners[index] = 'BYE';
      changed = true;
      return;
    }
    if (labels[0] === 'BYE' && labels[1] && labels[1] !== 'BYE' && !root._roundWinners?.[index]) {
      buttons[1].click();
      changed = true;
    } else if (labels[1] === 'BYE' && labels[0] && labels[0] !== 'BYE' && !root._roundWinners?.[index]) {
      buttons[0].click();
      changed = true;
    }
  });
  if (changed && root._roundWinners?.every(Boolean)) {
    const next = root._roundWinners.filter(Boolean) as string[];
    const real = next.filter((name) => name !== 'BYE');
    if (real.length > 1 && real.length !== next.length) {
      root._roundWinners = root._roundWinners.map((name) => name === 'BYE' ? null : name);
    }
  }
}

const observer = new MutationObserver(() => queueMicrotask(hardenBracket));
const root = document.querySelector('.generator-page');
if (root) observer.observe(root, { childList: true, subtree: true });
hardenBracket();

export {};
