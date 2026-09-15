import type { APIRoute } from 'astro';
import { analyzeGitHubRepository } from '../../lib/github-analyzer';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const url = typeof body?.url === 'string' ? body.url : '';
    if (!url) return Response.json({ error:'GitHub repository URL is required.' }, { status:400 });
    return Response.json(await analyzeGitHubRepository(url));
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to analyze repository.' }, { status:400 });
  }
};
