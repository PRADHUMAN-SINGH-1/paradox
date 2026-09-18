function markPrefilled() {
  document.querySelectorAll<HTMLElement>('.generator-page.ai-page .field input, .generator-page.ai-page .field textarea, .generator-page.utility-page .field input, .generator-page.utility-page .field textarea').forEach((el) => {
    const field = el as HTMLInputElement | HTMLTextAreaElement;
    if (!(field as HTMLInputElement).value) return;
    if (field.dataset.prefilled !== 'true') field.dataset.prefilled = 'true';
    field.classList.add('prefilled');
    const original = field.dataset.initialValue ?? field.value;
    field.dataset.initialValue = original;
    field.addEventListener('focus', () => field.classList.remove('prefilled'), { once: false });
    field.addEventListener('blur', () => {
      if (field.value === field.dataset.initialValue && field.value.trim()) field.classList.add('prefilled');
    });
    field.addEventListener('input', () => field.classList.remove('prefilled'));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', markPrefilled, { once: true });
else markPrefilled();

export {};
