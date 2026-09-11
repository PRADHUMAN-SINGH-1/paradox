import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://paradox.engineer',
  output: 'static',
  build: { format: 'directory' },
});
