const ASSIGNMENT_SECRET = /(api[_-]?key|token|secret|password|private[_-]?key|client[_-]?secret|access[_-]?key)\\s*[:=]\\s*['"][^'"]+['"]/gi;
const BEARER_SECRET = /\\bBearer\\s+[A-Za-z0-9._~+/=-]{16,}/gi;
const GITHUB_TOKEN = /\\b(?:ghp|gho|ghs|ghu|github_pat)_[A-Za-z0-9_]+/gi;
const OPENAI_TOKEN = /\\bsk-[A-Za-z0-9_-]{12,}/gi;
const GOOGLE_TOKEN = /\\bAIza[0-9A-Za-z_-]{20,}/g;
const AWS_ACCESS_KEY = /\\bAKIA[0-9A-Z]{16}\\b/g;
const PRIVATE_KEY = /-----BEGIN [^-]*PRIVATE KEY-----[\\s\\S]*?-----END [^-]*PRIVATE KEY-----/gi;

export function redactSensitiveText(value: string): string {
  return String(value || '')
    .replace(PRIVATE_KEY, '[REDACTED PRIVATE KEY]')
    .replace(GITHUB_TOKEN, '[REDACTED GITHUB TOKEN]')
    .replace(OPENAI_TOKEN, '[REDACTED API KEY]')
    .replace(GOOGLE_TOKEN, '[REDACTED API KEY]')
    .replace(AWS_ACCESS_KEY, '[REDACTED AWS ACCESS KEY]')
    .replace(BEARER_SECRET, 'Bearer [REDACTED]')
    .replace(ASSIGNMENT_SECRET, '$1=[REDACTED]');
}
