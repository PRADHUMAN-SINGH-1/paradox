import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const SITE = 'https://paradox.engineer';
const GSC_SITE = process.env.GSC_SITE_URL || 'sc-domain:paradox.engineer';
const INDEXNOW_KEY = '7b6f4a2d9e314c5f8a1d0b3e6f2c9a47';

const sitemapText = await fs.readFile('public/sitemap.xml', 'utf8').catch(() => '');
const sitemapUrls = [...sitemapText.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].trim());
const fallbackUrls = [`${SITE}/`, `${SITE}/daily/`, `${SITE}/world/`, `${SITE}/trending/`, `${SITE}/utilities/`];
const urls = [...new Set([...sitemapUrls, ...fallbackUrls])];

function b64url(value) { return Buffer.from(value).toString('base64url'); }

async function getGoogleToken() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  if (!raw) return null;
  const account = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: account.client_email, scope: 'https://www.googleapis.com/auth/webmasters', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const assertion = `${unsigned}.${signer.sign(account.private_key, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error(`Google token ${response.status}: ${await response.text()}`);
  return (await response.json()).access_token;
}

async function submitGoogleSitemap() {
  const token = await getGoogleToken();
  if (!token) return { enabled: false, reason: 'GSC_SERVICE_ACCOUNT_JSON_B64 not configured' };
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps/${encodeURIComponent(`${SITE}/sitemap.xml`)}`;
  const response = await fetch(endpoint, { method: 'PUT', headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Google sitemap ${response.status}: ${await response.text()}`);
  return { enabled: true, submitted: `${SITE}/sitemap.xml` };
}

async function submitBing() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { enabled: false, reason: 'BING_WEBMASTER_API_KEY not configured' };
  const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/SubmitUrlBatch?apikey=${encodeURIComponent(key)}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ siteUrl: SITE, urlList: urls.slice(0, 500) })
  });
  if (!response.ok) throw new Error(`Bing indexing ${response.status}: ${await response.text()}`);
  return { enabled: true, submitted: Math.min(urls.length, 500) };
}

async function submitIndexNow() {
  const endpoint = 'https://api.indexnow.org/indexnow';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: 'paradox.engineer',
      key: INDEXNOW_KEY,
      keyLocation: `${SITE}/${INDEXNOW_KEY}.txt`,
      urlList: urls.slice(0, 10000),
    }),
  });
  const text = await response.text();
  if (!response.ok && response.status !== 202) throw new Error(`IndexNow ${response.status}: ${text}`);
  return { enabled: true, status: response.status, submitted: Math.min(urls.length, 10000) };
}

const results = {};
try { results.google = await submitGoogleSitemap(); } catch (error) { results.google = { enabled: false, error: error.message }; }
try { results.bing = await submitBing(); } catch (error) { results.bing = { enabled: false, error: error.message }; }
try { results.indexNow = await submitIndexNow(); } catch (error) { results.indexNow = { enabled: false, error: error.message }; }
console.log(JSON.stringify({ generatedAt: new Date().toISOString(), urlCount: urls.length, ...results }, null, 2));
