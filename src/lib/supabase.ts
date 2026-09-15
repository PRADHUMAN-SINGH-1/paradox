import { createBrowserClient, createServerClient } from '@supabase/ssr';
import type { MiddlewareHandler } from 'astro';

export function browserSupabase() {
  return createBrowserClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY);
}

export function serverSupabase(context: Parameters<MiddlewareHandler>[0]) {
  return createServerClient(import.meta.env.PUBLIC_SUPABASE_URL, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => context.cookies.getAll().map(cookie => ({ name: cookie.name, value: cookie.value })),
      setAll: cookies => cookies.forEach(({ name, value, options }) => context.cookies.set(name, value, options)),
    },
  });
}
