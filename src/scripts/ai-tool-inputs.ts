function normalizeInput(field: HTMLInputElement | HTMLTextAreaElement) {
  const value = field.value.trim();
  if (value) {
    if (!field.placeholder) field.placeholder = value;
    field.value = '';
  }
  field.classList.remove('prefilled');
  field.removeAttribute('aria-valuenow');
}

function scan() {
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    '.generator-page.ai-page #fields input, .generator-page.ai-page #fields textarea, .studio #fields input, .studio #fields textarea'
  ).forEach(normalizeInput);
}

scan();
window.requestAnimationFrame(scan);
window.setTimeout(scan, 50);
window.setTimeout(scan, 250);

const observer = new MutationObserver(() => scan());
if (document.body) observer.observe(document.body, { childList: true, subtree: true });
