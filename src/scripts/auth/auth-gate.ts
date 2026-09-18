import { currentUser } from '../../lib/supabase.ts';

function loginUrl() {
  const next = `${location.pathname}${location.search}${location.hash}`;
  return `/auth/?next=${encodeURIComponent(next)}`;
}

for (const button of document.querySelectorAll<HTMLElement>('[data-requires-auth]')) {
  button.addEventListener('click', async (event) => {
    let user: Awaited<ReturnType<typeof currentUser>> = null;
    try {
      user = await currentUser();
    } catch {
      event.preventDefault();
      location.href = loginUrl();
      return;
    }
    if (user) return;
    event.preventDefault();
    location.href = loginUrl();
  });
}
