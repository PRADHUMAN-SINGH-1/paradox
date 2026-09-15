import type { Analysis } from './types.ts';

const TTL_MS = 30 * 60 * 1000;
const mem = new Map<string, { at: number; value: Analysis }>();

function key(fullName: string): string {
  return fullName.toLowerCase();
}

export function readCache(fullName: string): Analysis | null {
  const k = key(fullName);
  const hit = mem.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const raw = localStorage.getItem(`paradox:analysis:${k}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: Analysis };
    if (Date.now() - parsed.at < TTL_MS) {
      mem.set(k, parsed);
      return parsed.value;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function writeCache(analysis: Analysis): void {
  const entry = { at: Date.now(), value: analysis };
  mem.set(key(analysis.meta.fullName), entry);
  try {
    localStorage.setItem(`paradox:analysis:${key(analysis.meta.fullName)}`, JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

const VERIFY_WINDOW = 10 * 60 * 1000;
const ANON_MAX = 8;

export function allowAnonymousVerify(): boolean {
  try {
    const raw = JSON.parse(localStorage.getItem('paradox:verify-times') || '[]') as number[];
    const recent = raw.filter((t) => Date.now() - t < VERIFY_WINDOW);
    if (recent.length >= ANON_MAX) return false;
    recent.push(Date.now());
    localStorage.setItem('paradox:verify-times', JSON.stringify(recent));
    return true;
  } catch {
    return true;
  }
}
