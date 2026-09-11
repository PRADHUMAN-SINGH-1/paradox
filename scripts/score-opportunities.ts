import { readFile, writeFile } from "node:fs/promises";

type DemandPoint = {
  query: string;
  traffic?: number;
  avg7?: number;
  avg30?: number;
  geo?: string;
  history?: Array<{ date: string; value: number }>;
};

type RawDemand = {
  signals?: DemandPoint[];
  sources?: Record<string, unknown>;
};

type Opportunity = {
  slug: string;
  query: string;
  geo?: string;
  toolId: string;
  score: number;
  metrics: {
    demandVelocity: number;
    utilityIntent: number;
    competitionSaturation: number;
    feasibilityMultiplier: 0 | 1;
  };
};

const TOOL_MAP: Record<string, string[]> = {
  calculator: ["calculator", "calculate", "percentage", "percent", "tip", "discount", "age"],
  generator: ["generator", "generate", "random", "bingo", "teams", "wheel", "bracket", "raffle", "certificate", "seating"],
  converter: ["convert", "converter", "conversion", "unit", "currency", "timezone"],
};

const INFO_ONLY = ["what is", "meaning", "definition", "history", "who is", "why", "news", "latest"];
const ACTION_WORDS = ["calculator", "calculate", "generator", "generate", "converter", "convert", "maker", "planner", "picker", "template"];

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const normalise = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();

function demandVelocity(point: DemandPoint): number {
  if (point.avg7 != null && point.avg30 != null) {
    const baseline = Math.max(1, point.avg30);
    return Number(clamp(50 + ((point.avg7 - baseline) / baseline) * 50, 0, 100).toFixed(2));
  }
  const history = point.history ?? [];
  if (history.length) {
    const last30 = history.slice(-30).map(x => x.value);
    const last7 = last30.slice(-7);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const a7 = avg(last7);
    const a30 = Math.max(1, avg(last30));
    return Number(clamp(50 + ((a7 - a30) / a30) * 50, 0, 100).toFixed(2));
  }
  return Number(clamp(Math.log10(Math.max(10, point.traffic ?? 0)) * 12, 0, 100).toFixed(2));
}

function utilityIntent(query: string): number {
  const q = normalise(query);
  let score = 0.55;
  if (ACTION_WORDS.some(word => q.includes(word))) score += 0.75;
  if (INFO_ONLY.some(word => q.includes(word))) score -= 0.4;
  if (q.split(" ").length >= 3) score += 0.15;
  return Number(clamp(score, 0.1, 2).toFixed(2));
}

function competitionSaturation(query: string): number {
  const tokens = normalise(query).split(" ").filter(Boolean);
  const longTailRelief = Math.min(5.5, Math.max(0, tokens.length - 1) * 1.35);
  const broadPenalty = tokens.length <= 1 ? 1.4 : 0;
  return Number(clamp(9.5 - longTailRelief + broadPenalty, 1, 10).toFixed(2));
}

function feasibleTool(query: string): string | null {
  const q = normalise(query);
  for (const [toolId, terms] of Object.entries(TOOL_MAP)) {
    if (terms.some(term => q.includes(term))) return toolId;
  }
  return null;
}

const raw = JSON.parse(await readFile("src/data/raw_demand.json", "utf8")) as RawDemand;
const points = raw.signals ?? ((raw.sources?.googleTrends as { rows?: DemandPoint[] } | undefined)?.rows ?? []);
const opportunities: Opportunity[] = [];

for (const point of points) {
  const query = String(point.query ?? "").trim();
  const toolId = feasibleTool(query);
  const feasibilityMultiplier: 0 | 1 = toolId ? 1 : 0;
  if (!query || !toolId) continue;

  const demand = demandVelocity(point);
  const intent = utilityIntent(query);
  const saturation = competitionSaturation(query);
  const score = Number(((demand * intent / saturation) * feasibilityMultiplier).toFixed(2));
  if (score <= 80) continue;

  opportunities.push({
    slug: normalise(query).replace(/\s+/g, "-"),
    query,
    geo: point.geo,
    toolId,
    score,
    metrics: {
      demandVelocity: demand,
      utilityIntent: intent,
      competitionSaturation: saturation,
      feasibilityMultiplier,
    },
  });
}

const unique = [...new Map(opportunities.map(item => [item.slug, item])).values()]
  .sort((a, b) => b.score - a.score);

await writeFile(
  "src/data/verified_opportunities.json",
  JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), formula: "((Demand Velocity * Utility Intent) / Competition Saturation) * Feasibility Multiplier", opportunities: unique }, null, 2) + "\n",
);
console.log(`Generated ${unique.length} verified opportunities.`);
