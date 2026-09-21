import type { FileHit, RiskIndicator } from './types.ts';
import { redactSensitiveText } from './sanitize.ts';

type Rule = {
  category: string;
  severity: RiskIndicator['severity'];
  test: RegExp;
  reason: string;
};

// Risk rules intentionally focus on security-relevant behavior. Ordinary HTTP,
// browser automation and package-install commands are capabilities, not risks
// by themselves; context is required before a finding becomes a risk signal.
const RULES: Rule[] = [
  { category: 'GitHub Actions injection surface', severity: 'MODERATE', test: /(?:^|\n)\s*run:\s*[^\n]*\$\{\{\s*github\.event\.(?:issue|pull_request|comment|discussion|review|review_comment)/im, reason: 'A GitHub Actions workflow interpolates attacker-influenced event data directly into a shell command.' },
  { category: 'Docker socket exposure', severity: 'HIGH', test: /(?:docker\.sock|\/var\/run\/docker\.sock)/i, reason: 'A container can access the host Docker daemon socket.' },
  { category: 'Host network mode', severity: 'MODERATE', test: /network_mode:\s*host|--network(?:=|\s+)host\b/i, reason: 'Container configuration shares the host network namespace.' },
  { category: 'Remote script execution', severity: 'HIGH', test: /(?:curl|wget)[^\n]{0,120}\|\s*(?:ba)?sh\b/i, reason: 'Downloads and executes a remote script.' },
  { category: 'Shell execution', severity: 'HIGH', test: /(?:child_process(?:\.(?:exec|execFile|spawn|spawnSync|execFileSync))|require\s*\(\s*['"]child_process['"]|from\s*['"]child_process['"]|os\.system\s*\(|subprocess\.(?:run|Popen|call|check_call|check_output)\s*\([^)]*shell\s*=\s*True)/i, reason: 'Repository code explicitly exposes process or shell execution primitives.' },
  { category: 'Dynamic code execution', severity: 'HIGH', test: /\beval\s*\(|new Function\s*\(/i, reason: 'Dynamic code evaluation can execute untrusted input.' },
  { category: 'Privileged Docker', severity: 'HIGH', test: /privileged:\s*true|--privileged\b/i, reason: 'Container may run in privileged mode.' },
  { category: 'Broad filesystem mount', severity: 'MODERATE', test: /(?:volumes|mounts):[\s\S]{0,240}(?:^|\s)-?\s*\/:(?:\/|$)/im, reason: 'A broad host filesystem mount pattern was observed.' },
  { category: 'Credential access', severity: 'MODERATE', test: /(?:process\.env|os\.(?:getenv|environ))\s*(?:\.|\[)[^\n]*(?:KEY|TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL)/i, reason: 'Code reads an environment value whose name suggests a secret or credential.' },
  { category: 'Credential file access', severity: 'MODERATE', test: /(?:readFile|open|cat|source)\b[^\n]{0,120}(?:\.env|id_rsa|credentials\.json|\.npmrc)/i, reason: 'Code appears to read a local credential/configuration file.' },
  { category: 'SSH / token material', severity: 'HIGH', test: /BEGIN (?:OPENSSH|RSA) PRIVATE KEY|id_rsa\b|github_token\s*[:=]/i, reason: 'Repository contains a strong indicator of credential or private-key material.' },
];

function snippet(text: string, re: RegExp): string {
  const m = text.match(re);
  if (!m || m.index == null) return '';
  return redactSensitiveText(text.slice(Math.max(0, m.index - 24), m.index + 140).replace(/\s+/g, ' ').trim());
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
