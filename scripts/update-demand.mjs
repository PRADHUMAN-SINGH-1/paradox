const WIKI_PROJECTS = [
  'en.wikipedia.org', 'es.wikipedia.org', 'hi.wikipedia.org', 'fr.wikipedia.org',
  'de.wikipedia.org', 'pt.wikipedia.org', 'ja.wikipedia.org', 'id.wikipedia.org'
];

const OPPORTUNITIES = [
  { id: 'classroom-bingo', label: 'Classroom bingo', mode: 'bingo', route: '/bingo-card-generator/', phrases: ['bingo','school','classroom','teacher','students','education','exam'] },
  { id: 'word-search-puzzles', label: 'Word-search puzzles', mode: 'words', route: '/word-search-generator/', phrases: ['word search','puzzle','crossword','school','spelling','vocabulary','quiz'] },
  { id: 'random-teams', label: 'Random team splitting', mode: 'teams', route: '/random-team-generator/', phrases: ['team','teams','workshop','classroom','football','school','office'] },
  { id: 'decision-wheel', label: 'Random decision wheel', mode: 'wheel', route: '/decision-wheel/', phrases: ['choice','decision','wheel','random','party','game'] },
  { id: 'tournament-brackets', label: 'Tournament brackets', mode: 'bracket', route: '/tournament-bracket-generator/', phrases: ['tournament','championship','cup','league','bracket','football','basketball','tennis'] },
  { id: 'raffle-tickets', label: 'Raffle tickets', mode: 'raffle', route: '/raffle-ticket-generator/', phrases: ['raffle','fundraiser','lottery','charity','giveaway','tickets'] },
  { id: 'seating-charts', label: 'Seating charts', mode: 'seating', route: '/seating-chart-generator/', phrases: ['wedding','seating','dinner','conference','classroom','event','table'] },
  { id: 'certificates', label: 'Certificates', mode: 'certificate', route: '/certificate-maker/', phrases: ['certificate','award','graduation','school','appreciation','recognition'] }
];

const headers = { 'User-Agent': 'PARADOX-Makers-Demand-Radar/1.0 (https://paradox.engineer)' };

function isoDate(daysAgo = 1) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function getJson(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function safeText(value) {
  return String(value || '').toLowerCase().replace(/[_-]+/g, ' ');
}

async function wikiSignals() {
  const target = isoDate(1);
  const parts = target.split('-');
  const result = [];
  for (const project of WIKI_PROJECTS) {
    const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/${project}/all-access/${parts[0]}/${parts[1]}/${parts[2]}/all-days`;
    try {
      const data = await getJson(url);
      const articles = (data.items?.[0]?.articles || []).slice(0, 1000);
      result.push({ project, date: target, articles: articles.map(a => ({ title: a.article, views: a.views || 0 })) });
    } catch (error) {
      result.push({ project, date: target, articles: [], error: error.message });
    }
  }
  return result;
}

async function gdeltSignal(phrase) {
  const query = encodeURIComponent(`"${phrase}"`);
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=timelinevol&format=json&timespan=7d&timelinesmooth=3`;
  try {
    const data = await getJson(url);
    const values = (data.timeline?.[0]?.data || []).map(point => Number(point.value) || 0);
    return values.reduce((sum, value) => sum + value, 0);
  } catch {
    return 0;
  }
}

const wiki = await wikiSignals();
const wikiTitles = wiki.flatMap(source => source.articles.map(article => ({ ...article, project: source.project })));

const opportunities = [];
for (const opportunity of OPPORTUNITIES) {
  const wikiHits = wikiTitles.filter(item => opportunity.phrases.some(term => safeText(item.title).includes(term)));
  const wikiScore = wikiHits.slice(0, 25).reduce((sum, item) => sum + Math.log10(Math.max(10, item.views)), 0);
  const mediaScore = await gdeltSignal(opportunity.phrases.slice(0, 2).join(' OR '));
  const score = Number((wikiScore * 10 + Math.log10(Math.max(1, mediaScore) + 1) * 20).toFixed(3));
  opportunities.push({
    id: opportunity.id,
    label: opportunity.label,
    mode: opportunity.mode,
    route: opportunity.route,
    score,
    wikipediaMatches: wikiHits.slice(0, 8).map(item => ({ title: item.title, project: item.project, views: item.views })),
    note: 'Global attention signal; not Google keyword/search-volume data.'
  });
}

opportunities.sort((a, b) => b.score - a.score);

const output = {
  asOf: isoDate(1),
  refreshedAt: new Date().toISOString().slice(0, 10),
  sources: [
    { name: 'Wikimedia Analytics', url: 'https://doc.wikimedia.org/generated-data-platform/aqs/analytics-api/', scope: 'Most-viewed Wikipedia pages across eight language projects.' },
    { name: 'GDELT', url: 'https://www.gdeltproject.org/', scope: 'Global news-coverage volume signals across languages.' }
  ],
  opportunities,
  disclaimer: 'This radar measures public attention signals. It does not expose private user data and does not claim to be Google search volume.'
};

const fs = await import('node:fs/promises');
await fs.mkdir('src/data', { recursive: true });
await fs.writeFile('src/data/demand.json', `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${opportunities.length} demand opportunities for ${output.asOf}`);
