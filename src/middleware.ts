import { defineMiddleware } from 'astro:middleware';
import { serverSupabase } from './lib/supabase';

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = serverSupabase(context);
  const { data: { user } } = await supabase.auth.getUser();
  context.locals.supabase = supabase;
  context.locals.user = user;
  return next();
});
