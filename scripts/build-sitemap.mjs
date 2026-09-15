import fs from 'node:fs/promises';
import catalog from '../src/data/catalog.json' with { type: 'json' };

const base = 'https://paradox.engineer';
const urls = new Set(['/', '/agents/', '/verify/', '/compare/', '/trending/', '/about/', '/contact/', '/privacy/', '/terms/']);
for (const e of catalog) {
  urls.add(`/agents/${e.owner}/${e.repo}/`);
  urls.add(`/categories/${e.category}/`);
}
const lastmod = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].map((path) => `  <url><loc>${base}${path}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}\n</urlset>\n`;
await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/sitemap.xml', xml);
console.log(`Sitemap contains ${urls.size} URLs.`);
