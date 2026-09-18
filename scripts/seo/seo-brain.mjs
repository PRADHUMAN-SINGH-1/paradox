import fs from 'node:fs/promises';

const STATE_DIR = '.seo-state';
const PERFORMANCE_FILE = `${STATE_DIR}/performance.json`;
const MEMORY_FILE = `${STATE_DIR}/memory.json`;
const DEMAND = JSON.parse(await fs.readFile('src/data/demand/demand.json', 'utf8'));
const CANDIDATES = JSON.parse(await fs.readFile('src/data/seo/seo-opportunities.json', 'utf8'));

async function readJson(path, fallback) {
  try { return JSON.parse(await fs.readFile(path, 'utf8')); } catch { return fallback; }
}

function norm(value='') {
  return String(value).toLowerCase().replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function overlap(a, b) {
  const aa = new Set(norm(a).split(' ').filter(Boolean));
  const bb = new Set(norm(b).split(' ').filter(Boolean));
  let hits = 0;
  for (const token of aa) if (bb.has(token)) hits += 1;
  return hits;
}

function gscSignals(performance) {
  const queryRows = performance?.searchConsole?.queries || [];
  const pageRows = performance?.searchConsole?.pages || [];
  const queries = queryRows.map(row => ({
    query: row.keys?.[0] || '', page: row.keys?.[1] || '', country: row.keys?.[2] || '',
    clicks: Number(row.clicks) || 0, impressions: Number(row.impressions) || 0,
    ctr: Number(row.ctr) || 0, position: Number(row.position) || 0
  }));
  const pages = pageRows.map(row => ({
    page: row.keys?.[0] || '', clicks: Number(row.clicks) || 0,
    impressions: Number(row.impressions) || 0, ctr: Number(row.ctr) || 0,
    position: Number(row.position) || 0
  }));
  return { queries, pages };
}

function bingSignals(performance) {
  const rows = performance?.bing?.rows || [];
  return rows.map(row => ({
    query: row.Query || row.query || '', clicks: Number(row.Clicks || row.clicks) || 0,
    impressions: Number(row.Impressions || row.impressions) || 0,
    position: Number(row.AvgImpressionPosition || row.position) || 0
  }));
}

const performance = await readJson(PERFORMANCE_FILE, {});
const previous = await readJson(MEMORY_FILE, { version: 1, pages: {}, lastRun: null });
const { queries: gscQueries, pages: gscPages } = gscSignals(performance);
const bingQueries = bingSignals(performance);

const currentBySlug = new Map(CANDIDATES.map(item => [item.slug, item]));
const now = new Date();
const today = now.toISOString().slice(0, 10);

const learned = [];
for (const [slug, page] of Object.entries(previous.pages || {})) {
  if (!page) continue;
  const recentQueries = gscQueries.filter(row => row.page.includes(slug) || overlap(row.query, page.query) >= 2);
  const clicks = recentQueries.reduce((sum, row) => sum + row.clicks, 0);
  const impressions = recentQueries.reduce((sum, row) => sum + row.impressions, 0);
  const prior = currentBySlug.get(slug);
  learned.push({
    ...(prior || page),
    score: Math.max(Number(prior?.score || 0), Math.min(100, clicks * 12 + impressions / 20)),
    performance: { clicks, impressions, queries: recentQueries.slice(0, 10).map(row => row.query) },
    retainedFromHistory: !prior
  });
}

const opportunityRows = [];
for (const candidate of [...CANDIDATES, ...learned]) {
  if (!candidate?.slug) continue;
  const same = gscQueries.filter(row => overlap(row.query, candidate.query) >= 2 || overlap(row.query, candidate.title) >= 3);
  const pageMatches = gscPages.filter(row => row.page.includes(candidate.slug));
  const bing = bingQueries.filter(row => overlap(row.query, candidate.query) >= 2);
  const gscClicks = same.reduce((sum, row) => sum + row.clicks, 0);
  const gscImpressions = same.reduce((sum, row) => sum + row.impressions, 0);
  const pageClicks = pageMatches.reduce((sum, row) => sum + row.clicks, 0);
  const pageImpressions = pageMatches.reduce((sum, row) => sum + row.impressions, 0);
  const bingClicks = bing.reduce((sum, row) => sum + row.clicks, 0);
  const bingImpressions = bing.reduce((sum, row) => sum + row.impressions, 0);

  const demandScore = Number(candidate.score || 0);
  const demandFit = Math.min(30, demandScore * 0.8);
  const searchEvidence = Math.min(30, Math.log10(gscImpressions + 1) * 10 + Math.log10(bingImpressions + 1) * 5);
  const clickEvidence = Math.min(20, (gscClicks + pageClicks + bingClicks) * 4);
  const opportunity = Math.min(20, Math.max(0, 20 - Math.min(20, ((same[0]?.position || 100) - 1) / 5)));
  const finalScore = Number((demandFit + searchEvidence + clickEvidence + opportunity).toFixed(2));

  let action = 'watch';
  if (gscClicks > 0 || pageClicks > 0 || bingClicks > 0) action = 'keep-and-improve';
  else if (gscImpressions >= 20 || bingImpressions >= 20) action = 'keep-and-target';
  else if (demandScore >= 35) action = 'publish';
  else if (candidate.retainedFromHistory) action = 'retire';

  opportunityRows.push({
    ...candidate,
    score: finalScore,
    action,
    learning: {
      gscClicks, gscImpressions, pageClicks, pageImpressions,
      bingClicks, bingImpressions,
      observedQueries: [...new Set(same.map(row => row.query).filter(Boolean))].slice(0, 12)
    },
    lastEvaluated: today
  });
}

const deduped = new Map();
for (const row of opportunityRows) {
  const existing = deduped.get(row.slug);
  if (!existing || row.score > existing.score) deduped.set(row.slug, row);
}

const ranked = [...deduped.values()].sort((a, b) => b.score - a.score);
const publishable = ranked
  .filter(item => item.action !== 'retire')
  .slice(0, 30);

const nextPages = {};
for (const item of publishable) {
  const previousPage = previous.pages?.[item.slug] || {};
  nextPages[item.slug] = {
    slug: item.slug,
    query: item.query,
    toolId: item.toolId,
    firstSeen: previousPage.firstSeen || today,
    lastSeen: today,
    timesPublished: (previousPage.timesPublished || 0) + (item.action === 'publish' ? 1 : 0),
    lastScore: item.score,
    lastAction: item.action
  };
}

const plan = {
  version: 1,
  generatedAt: new Date().toISOString(),
  strategy: {
    demandWeight: 0.35,
    trendWeight: 0.20,
    ownedSearchWeight: 0.25,
    clickEvidenceWeight: 0.10,
    pageOpportunityWeight: 0.10,
    maxActivePages: 30
  },
  performanceAvailable: {
    googleSearchConsole: Boolean(performance?.searchConsole?.enabled),
    bing: Boolean(performance?.bing?.enabled)
  },
  active: publishable,
  retired: ranked.filter(item => item.action === 'retire').map(item => item.slug),
  learning: {
    strongestQueries: gscQueries.sort((a,b) => b.impressions - a.impressions).slice(0, 30),
    strongestPages: gscPages.sort((a,b) => b.impressions - a.impressions).slice(0, 20)
  },
  disclaimer: 'This plan optimizes from aggregate public demand and optional first-party Search Console/Bing data. It does not guarantee rankings, traffic or revenue.'
};

await fs.mkdir('src/data/seo', { recursive: true });
await fs.mkdir(STATE_DIR, { recursive: true });
await fs.writeFile('src/data/seo/seo-opportunities.json', `${JSON.stringify(publishable, null, 2)}\n`);
await fs.writeFile('src/data/seo/seo-plan.json', `${JSON.stringify(plan, null, 2)}\n`);
await fs.writeFile(MEMORY_FILE, `${JSON.stringify({ version: 1, lastRun: today, pages: nextPages }, null, 2)}\n`);
console.log(`SEO brain: ${publishable.length} active pages, ${plan.retired.length} retired, GSC=${plan.performanceAvailable.googleSearchConsole}, Bing=${plan.performanceAvailable.bing}`);
