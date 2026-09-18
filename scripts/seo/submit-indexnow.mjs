import fs from 'node:fs/promises';

const host = 'https://paradox.engineer';
const key = '7b6f4a2d9e314c5f8a1d0b3e6f2c9a47';

const urls = new Set([
  `${host}/`,
  `${host}/daily/`,
  `${host}/world/`,
  `${host}/trending/`,
  `${host}/utilities/`,
]);

const sitemap = await fs.readFile('public/sitemap.xml', 'utf8').catch(() => '');
for (const match of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) urls.add(match[1].trim());

const body = {
  host: 'paradox.engineer',
  key,
  keyLocation: `${host}/${key}.txt`,
  urlList: [...urls].slice(0, 10000),
};

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify(body),
});

console.log(`IndexNow status: ${response.status}; submitted ${body.urlList.length} URLs`);
if (!response.ok && response.status !== 202) {
  console.warn(await response.text());
}
