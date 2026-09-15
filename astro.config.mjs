import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://paradox.engineer',
  output: 'static',
  build: { format: 'directory' },
  redirects: {
    '/account': '/dashboard',
    '/studio': '/verify',
    '/ai-radar': '/trending',
  },
});
