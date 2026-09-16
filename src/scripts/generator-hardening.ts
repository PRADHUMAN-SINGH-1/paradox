function hardenBracket() {
  const root = document.querySelector<HTMLElement>('.generator-page[data-mode="bracket"]') as (HTMLElement & { _roundWinners?: Array<string | null> }) | null;
  if (!root) return;
  const grid = root.querySelector('.bracket-grid');
  const winners = root._roundWinners;
  if (!grid || !winners) return;
  const matches = Array.from(grid.querySelectorAll<HTMLElement>('.bracket-match'));
  const picks = matches.map((match) => Array.from(match.querySelectorAll<HTMLButtonElement>('.bracket-pick')));
  let changed = false;
  picks.forEach((buttons, index) => {
    if (buttons.length !== 2) return;
    const labels = buttons.map((button) => button.textContent?.trim() || '');
    if (labels[0] === 'BYE' && labels[1] === 'BYE' && winners[index] == null) {
      winners[index] = 'BYE';
      changed = true;
      return;
    }
    if (labels[0] === 'BYE' && labels[1] && labels[1] !== 'BYE' && !winners[index]) {
      buttons[1].click();
      changed = true;
    } else if (labels[1] === 'BYE' && labels[0] && labels[0] !== 'BYE' && !winners[index]) {
      buttons[0].click();
      changed = true;
    }
  });
  if (changed && winners.every(Boolean)) {
    const trigger = picks.flat().find((button) => !button.disabled);
    trigger?.click();
  }
}

const observer = new MutationObserver(() => queueMicrotask(hardenBracket));
const root = document.querySelector('.generator-page');
if (root) observer.observe(root, { childList: true, subtree: true });
hardenBracket();

export {};
