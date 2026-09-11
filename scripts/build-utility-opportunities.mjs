import fs from 'node:fs/promises';

const DEMAND = JSON.parse(await fs.readFile('src/data/demand.json', 'utf8'));
const trends = Array.isArray(DEMAND.globalTrends) ? DEMAND.globalTrends : [];

const BLUEPRINTS = [
  { slug:'percentage-calculator', mode:'percentage', label:'Percentage Calculator', terms:['percentage','percent','percentage calculator','percent calculator','discount','increase','decrease','tip'] },
  { slug:'age-calculator', mode:'age', label:'Age Calculator', terms:['age calculator','how old','age','birthday','birth date','years old'] },
  { slug:'time-zone-converter', mode:'timezone', label:'Time Zone Converter', terms:['time zone','timezone','what time','time in','pst','est','gmt','utc','cet','ist','jst','aest'] },
  { slug:'unit-converter', mode:'units', label:'Unit Converter', terms:['unit converter','convert','conversion','km','miles','kg','pounds','celsius','fahrenheit','meters','feet','inches'] },
  { slug:'countdown-timer', mode:'countdown', label:'Countdown Timer', terms:['countdown','countdown timer','timer','deadline','days until','hours until','exam date'] },
  { slug:'random-number-generator', mode:'random', label:'Random Number Generator', terms:['random number','randomizer','random generator','pick a number','lottery numbers'] },
  { slug:'word-counter', mode:'text', label:'Word Counter', terms:['word count','character count','characters','words','count words','text counter'] },
  { slug:'date-difference-calculator', mode:'datediff', label:'Date Difference Calculator', terms:['date difference','days between','date calculator','how many days','days until'] }
];

function norm(value='') { return String(value).toLowerCase().replace(/[^a-z0-9\s]+/g,' ').replace(/\s+/g,' ').trim(); }
function scoreBlueprint(blueprint, query) {
  const text = norm(query);
  return blueprint.terms.reduce((score, term) => score + (text.includes(norm(term)) ? (term.length > 8 ? 4 : 2) : 0), 0);
}
function pretty(query) { return String(query || '').trim(); }

const ranked = BLUEPRINTS.map(blueprint => {
  const matches = trends
    .map(item => ({ ...item, match: scoreBlueprint(blueprint, item.query) }))
    .filter(item => item.match > 0)
    .sort((a,b) => (b.match + Number(b.trafficValue || 0) / 1e6) - (a.match + Number(a.trafficValue || 0) / 1e6));
  const top = matches.slice(0, 8);
  const signal = top.reduce((sum, item) => sum + item.match + Math.log10(Math.max(10, Number(item.trafficValue || 10))) * 0.35, 0);
  return {
    ...blueprint,
    score: Number(signal.toFixed(2)),
    matchedTrends: top.map(item => ({ query: pretty(item.query), geo:item.geo, traffic:item.traffic, trafficValue:item.trafficValue }))
  };
}).sort((a,b) => b.score - a.score);

const active = ranked.slice(0, 8).map(item => ({
  ...item,
  title: `${item.label} — Free Online Tool`,
  description: `Use a free ${item.label.toLowerCase()} in your browser with no account. ${item.matchedTrends.length ? `Built from current demand signals such as ${item.matchedTrends.slice(0,3).map(x => x.query).join(', ')}.` : 'Useful for everyday calculations and quick decisions.'}`
}));

await fs.mkdir('src/data', { recursive:true });
await fs.writeFile('src/data/utility-opportunities.json', `${JSON.stringify(active, null, 2)}\n`);
console.log(`Utility factory: ${active.length} blueprints available.`);
