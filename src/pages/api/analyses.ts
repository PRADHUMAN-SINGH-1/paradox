import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ locals, request }) => {
  if (!locals.user) return Response.json({ error:'Sign in to save analyses.' }, { status:401 });
  try {
    const body = await request.json();
    if (!body?.repo_full_name || typeof body?.result !== 'object') return Response.json({ error:'Invalid analysis payload.' }, { status:400 });
    const { error } = await locals.supabase.from('analyses').upsert({ user_id:locals.user.id, repo_full_name:body.repo_full_name, score:Number(body.result.score)||0, verdict:String(body.result.verdict||'REVIEW'), result:body.result }, { onConflict:'user_id,repo_full_name' });
    if (error) throw error;
    return Response.json({ ok:true });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : 'Unable to save analysis.' }, { status:500 });
  }
};
