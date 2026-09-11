export type DemandSignal = {
  id?: string;
  query: string;
  source: string;
  volumeProxy?: number;
  utilityIntent?: number;
  saturation?: number;
  geo?: string;
  freshness?: number;
  toolId?: string;
  route?: string;
};

export type Opportunity = DemandSignal & {
  score: number;
  decision: 'publish' | 'watch' | 'reject';
  reasons: string[];
};

const clamp = (n:number,min=0,max=100) => Math.max(min,Math.min(max,n));

/**
 * Deterministic pSEO scoring.
 * Score = demand × utility intent − saturation, with freshness as a bounded bonus.
 * Inputs are normalized 0–100 proxies; they are NOT claimed Google search volume.
 */
export function scoreOpportunity(signal: DemandSignal): Opportunity {
  const demand = clamp(Number(signal.volumeProxy ?? 0));
  const intent = clamp(Number(signal.utilityIntent ?? 0));
  const saturation = clamp(Number(signal.saturation ?? 0));
  const freshness = clamp(Number(signal.freshness ?? 0));

  const base = (demand * intent) / 100;
  const freshnessBonus = freshness * 0.08;
  const score = Math.round(clamp(base - saturation * 0.55 + freshnessBonus) * 100) / 100;

  const reasons:string[] = [];
  if (demand >= 60) reasons.push('strong public demand signal');
  if (intent >= 70) reasons.push('high utility intent');
  if (saturation <= 35) reasons.push('manageable saturation');
  if (freshness >= 70) reasons.push('fresh signal');
  if (!reasons.length) reasons.push('insufficient evidence');

  const decision = score >= 62 && intent >= 55
    ? 'publish'
    : score >= 38
      ? 'watch'
      : 'reject';

  return {...signal, score, decision, reasons};
}

export function rankOpportunities(signals:DemandSignal[], limit=30):Opportunity[] {
  return signals
    .filter(s => s.query?.trim())
    .map(scoreOpportunity)
    .sort((a,b) => b.score-a.score)
    .slice(0, limit);
}
