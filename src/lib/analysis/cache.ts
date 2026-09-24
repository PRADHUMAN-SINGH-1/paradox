import type { Analysis } from './types.ts';

const TTL_MS = 30 * 60 * 1000;
const ANALYSIS_CACHE_VERSION = 'v6';
const mem = new Map<string, { at: number; value: Analysis }>();

function key(fullName: string): string {
  return fullName.toLowerCase();
}

function storageKey(fullName: string): string {
  return `paradox:analysis:${ANALYSIS_CACHE_VERSION}:${key(fullName)}`;
}

export function readCache(fullName: string): Analysis | null {
  const k = key(fullName);
  const hit = mem.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  try {
    const raw = localStorage.getItem(storageKey(fullName));
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
    localStorage.setItem(storageKey(analysis.meta.fullName), JSON.stringify(entry));
  } catch {
    /* quota */
  }
}

const VERIFY_WINDOW = 10 * 60 * 1000;
const ANON_MAX = 8;

const SEARCH_TTL_MS = 5 * 60 * 1000;
const searchMem = new Map<string, { at: number; value: unknown }>();

function searchKey(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function readSearchCache<T>(query: string): T | null {
  const k = searchKey(query);
  const hit = searchMem.get(k);
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.value as T;
  try {
    const raw = sessionStorage.getItem(`paradox:search:${k}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; value: T };
    if (Date.now() - parsed.at < SEARCH_TTL_MS) {
      searchMem.set(k, parsed);
      return parsed.value;
    }
    sessionStorage.removeItem(`paradox:search:${k}`);
  } catch {
    /* ignore */
  }
  return null;
}

export function writeSearchCache(query: string, value: unknown): void {
  const k = searchKey(query);
  const entry = { at: Date.now(), value };
  searchMem.set(k, entry);
  try {
    sessionStorage.setItem(`paradox:search:${k}`, JSON.stringify(entry));
  } catch {
    /* ignore */
  }
}

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
