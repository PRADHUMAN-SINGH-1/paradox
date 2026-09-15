import fs from 'node:fs/promises';
import catalog from '../src/data/catalog.json' with { type: 'json' };
import aiTools from '../src/data/ai-tools.json' with { type: 'json' };
import utilityOpportunities from '../src/data/utility-opportunities.json' with { type: 'json' };
import seoOpportunities from '../src/data/seo-opportunities.json' with { type: 'json' };
import blacklist from '../src/data/blacklist.json' with { type: 'json' };

const base = 'https://paradox.engineer';
const urls = new Set([
  '/', '/agents/', '/verify/', '/compare/', '/trending/', '/about/', '/contact/', '/privacy/', '/terms/',
  '/ai/', '/ai-studio/', '/ai-radar/', '/studio/', '/daily/', '/world/', '/use-cases/', '/utilities/',
]);

for (const e of catalog) {
  urls.add(`/agents/${e.owner}/${e.repo}/`);
  urls.add(`/categories/${e.category}/`);
}

for (const tool of aiTools) {
  urls.add(`/ai/${tool.slug}/`);
}

for (const tool of utilityOpportunities) {
  urls.add(`/utilities/${tool.slug}/`);
}

const blocked = new Set(blacklist.slugs || []);
for (const item of seoOpportunities) {
  if (!blocked.has(item.slug) && item.evidence?.fallback !== true) urls.add(`/use-cases/${item.slug}/`);
}

const escapeXml = (value) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls].sort().map((path) => `  <url><loc>${escapeXml(base + path)}</loc></url>`).join('\n')}\n</urlset>\n`;
await fs.mkdir('public', { recursive: true });
await fs.writeFile('public/sitemap.xml', xml);
console.log(`Sitemap contains ${urls.size} URLs.`);
