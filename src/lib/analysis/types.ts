export type RiskSeverity = 'LOW' | 'MODERATE' | 'HIGH';
export type Verdict = 'VERIFIED' | 'QUESTIONABLE' | 'STALE' | 'HIGH-RISK';

export type Detection = {
  name: string;
  category: 'model' | 'framework' | 'tool' | 'capability';
  file: string;
  evidence: string;
};

export type RiskIndicator = {
  category: string;
  severity: RiskSeverity;
  file: string;
  evidence: string;
  reason: string;
};

export type EvidenceReference = {
  file: string;
  line: number;
  quote: string;
};

export type EvidenceClaim = {
  id: string;
  claim: string;
  status: 'CONFIRMED' | 'CONTRADICTED' | 'UNCONFIRMED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: EvidenceReference[];
};

export type IntelligenceCoverage = {
  treeFiles?: number;
  selectedFiles?: number;
  targetedFiles?: number;
  evidenceChars?: number;
};

export type IntelligenceReview = {
  summary: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confirmed: string[];
  needsReview: string[];
  contradictions: string[];
  recommendedVerdict?: 'VERIFIED' | 'QUESTIONABLE' | 'STALE' | 'HIGH-RISK';
  decisionReason?: string;
  claims?: EvidenceClaim[];
  provider?: string;
  model?: string;
  status?: 'READY' | 'UNAVAILABLE';
  coverage?: IntelligenceCoverage;
};

export type FileHit = { path: string; content: string };

export type RepoMeta = {
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  defaultBranch: string;
  license: string | null;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  topics: string[];
  archived: boolean;
  language: string | null;
  htmlUrl: string;
  homepage: string | null;
};

export type Scores = {
  health: number;
  freshness: number;
  documentation: number;
  activity: number;
  risk: number;
  paradox: number;
};

export type AnalysisCoverage = {
  selectedFiles: number;
  maxFiles: number;
  recursiveTree: boolean;
  treeFiles?: number;
  targetedFiles?: number;
  evidenceChars?: number;
};

export type Analysis = {
  meta: RepoMeta;
  languages: Record<string, number>;
  files: string[];
  detections: Detection[];
  risks: RiskIndicator[];
  scores: Scores;
  verdict: Verdict;
  verdictReasons: string[];
  structure: string[];
  readmeExcerpt: string;
  contributors: number | null;
  recentCommitCount: number | null;
  latestRelease: string | null;
  latestCommit: string | null;
  analyzedAt: string;
  method: 'static-analysis' | 'static-analysis+agent-review';
  coverage: AnalysisCoverage;
  intelligence?: IntelligenceReview;
};
