import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const ROOT = '.seo-state';
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:paradox.engineer';
const PUBLIC_SITE = 'https://paradox.engineer';
const HEADERS = { 'User-Agent': 'PARADOX-Makers-SEO-Brain/1.0' };

function daysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

function b64url(value) {
  return Buffer.from(value).toString('base64url');
}

function loadServiceAccount() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_JSON_B64;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  } catch (error) {
    throw new Error(`Invalid GSC_SERVICE_ACCOUNT_JSON_B64: ${error.message}`);
  }
}

async function googleAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  }));
  const unsigned = `${header}.${claim}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const signature = signer.sign(account.private_key, 'base64url');
  const assertion = `${unsigned}.${signature}`;
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...HEADERS },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion })
  });
  if (!response.ok) throw new Error(`Google token ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

async function gscQuery(token, dimensions, startDate, endDate) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...HEADERS },
    body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 25000, dataState: 'final' })
  });
  if (!response.ok) throw new Error(`Search Console ${response.status}: ${await response.text()}`);
  return response.json();
}

async function fetchSearchConsole() {
  const account = loadServiceAccount();
  if (!account) return { enabled: false, source: 'Google Search Console', reason: 'GSC_SERVICE_ACCOUNT_JSON_B64 not configured' };
  try {
    const token = await googleAccessToken(account);
    const startDate = daysAgo(31);
    const endDate = daysAgo(3);
    const [queries, pages] = await Promise.all([
      gscQuery(token, ['query', 'page', 'country'], startDate, endDate),
      gscQuery(token, ['page'], startDate, endDate)
    ]);
    return {
      enabled: true,
      site: SITE_URL,
      range: { startDate, endDate },
      queries: queries.rows || [],
      pages: pages.rows || []
    };
  } catch (error) {
    return { enabled: false, source: 'Google Search Console', error: error.message };
  }
}

async function fetchBing() {
  const key = process.env.BING_WEBMASTER_API_KEY;
  if (!key) return { enabled: false, source: 'Bing Webmaster', reason: 'BING_WEBMASTER_API_KEY not configured' };
  try {
    const endpoint = `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(PUBLIC_SITE)}&apikey=${encodeURIComponent(key)}`;
    const response = await fetch(endpoint, { headers: HEADERS });
    if (!response.ok) throw new Error(`Bing ${response.status}: ${await response.text()}`);
    const data = await response.json();
    return { enabled: true, site: PUBLIC_SITE, rows: data.d || data.value || [] };
  } catch (error) {
    return { enabled: false, source: 'Bing Webmaster', error: error.message };
  }
}

await fs.mkdir(ROOT, { recursive: true });
const [searchConsole, bing] = await Promise.all([fetchSearchConsole(), fetchBing()]);
const output = { generatedAt: new Date().toISOString(), searchConsole, bing };
await fs.writeFile(`${ROOT}/performance.json`, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Performance ingestion: GSC=${searchConsole.enabled ? 'on' : 'off'}, Bing=${bing.enabled ? 'on' : 'off'}`);
