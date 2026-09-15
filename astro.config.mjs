import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://paradox.engineer',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap()],
  build: { format: 'directory' },
});
