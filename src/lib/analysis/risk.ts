import type { FileHit, RiskIndicator } from './types.ts';

type Rule = {
  category: string;
  severity: RiskIndicator['severity'];
  test: RegExp;
  reason: string;
};

const RULES: Rule[] = [
  { category: 'Remote script execution', severity: 'HIGH', test: /curl[^\n]{0,80}\|\s*(ba)?sh|wget[^\n]{0,80}\|\s*(ba)?sh/i, reason: 'Downloads and executes a remote script.' },
  { category: 'Shell execution', severity: 'HIGH', test: /child_process|os\.system\(|subprocess\.[a-z]+\([^)]*shell\s*=\s*True|exec\(|spawn\(/i, reason: 'Process or shell execution was observed in repository files.' },
  { category: 'Dynamic code execution', severity: 'HIGH', test: /\beval\s*\(|new Function\s*\(/i, reason: 'Dynamic code evaluation can run untrusted input.' },
  { category: 'Privileged Docker', severity: 'HIGH', test: /privileged:\s*true|--privileged/i, reason: 'Container may run in privileged mode.' },
  { category: 'Broad filesystem mount', severity: 'MODERATE', test: /-\s*\/:\/|volumes:\s*\n[^\n]*\/:/i, reason: 'Broad host filesystem mount pattern observed.' },
  { category: 'Credential access', severity: 'MODERATE', test: /process\.env\.|os\.getenv|os\.environ|dotenv|\.env\b/i, reason: 'Reads environment variables or dotenv files (common, but relevant for secret handling).' },
  { category: 'SSH / token reference', severity: 'HIGH', test: /id_rsa|BEGIN OPENSSH|github_token|api_key\s*=\s*['\"][A-Za-z0-9]/i, reason: 'Possible credential or SSH key material referenced in files.' },
  { category: 'Network access', severity: 'LOW', test: /https?:\/\/|fetch\(|axios\.|requests\.(get|post)|httpx\./i, reason: 'Outbound network access is present.' },
  { category: 'Browser automation', severity: 'MODERATE', test: /playwright|puppeteer|selenium/i, reason: 'Can control a browser session.' },
  { category: 'chmod / install', severity: 'MODERATE', test: /chmod\s+\+x|pip install|npm install -g/i, reason: 'Install or permission-changing commands observed.' },
];

function snippet(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index == null) return '';
  const start = Math.max(0, m.index - 24);
  return text.slice(start, start + 140).replace(/\s+/g, ' ').trim();
}

export function detectRisks(files: FileHit[]): RiskIndicator[] {
  const out: RiskIndicator[] = [];
  const seen = new Set<string>();
  for (const file of files) {
    const lower = file.path.toLowerCase();
    if (lower.includes('readme')) continue;
    for (const rule of RULES) {
      const key = `${rule.category}:${file.path}`;
      if (seen.has(key)) continue;
      if (rule.category === 'Network access' && /package\.json|pyproject|go\.mod|cargo\.toml/.test(lower)) continue;
      if (rule.test.test(file.content)) {
        seen.add(key);
        out.push({
          category: rule.category,
          severity: rule.severity,
          file: file.path,
          evidence: snippet(file.content, rule.test),
          reason: rule.reason,
        });
      }
    }
  }
  return out.slice(0, 24);
}
