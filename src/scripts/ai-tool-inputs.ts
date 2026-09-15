const root = document.querySelector<HTMLElement>('.generator-page.ai-page');

if (root) {
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('#fields input, #fields textarea').forEach((field) => {
    const seeded = field.value.trim();
    if (seeded && !field.placeholder) field.placeholder = seeded;
    if (seeded) field.value = '';
    field.classList.remove('prefilled');
  });
}
