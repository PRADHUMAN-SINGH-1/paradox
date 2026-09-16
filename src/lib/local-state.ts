export type LocalSavedAgent = {
  repository: string;
  url: string;
  verdict?: string;
  score?: number;
  savedAt: string;
};

export type LocalScan = {
  repository: string;
  verdict: string;
  score: number;
  scannedAt: string;
};

const SAVED_KEY = 'paradox:saved-agents:v1';
const SCANS_KEY = 'paradox:scan-history:v1';

function read<T>(key: string): T[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value as T[] : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, value: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, 50)));
    return true;
  } catch {
    return false;
  }
}

export function saveLocalAgent(agent: LocalSavedAgent) {
  const items = read<LocalSavedAgent>(SAVED_KEY).filter((x) => x.repository !== agent.repository);
  items.unshift(agent);
  write(SAVED_KEY, items);
}

export function getLocalSavedAgents(): LocalSavedAgent[] {
  return read<LocalSavedAgent>(SAVED_KEY);
}

export function removeLocalAgent(repository: string) {
  write(SAVED_KEY, read<LocalSavedAgent>(SAVED_KEY).filter((x) => x.repository !== repository));
}

export function saveLocalScan(scan: LocalScan) {
  const items = read<LocalScan>(SCANS_KEY).filter((x) => x.repository !== scan.repository);
  items.unshift(scan);
  write(SCANS_KEY, items);
}

export function getLocalScans(): LocalScan[] {
  return read<LocalScan>(SCANS_KEY);
}

export function clearLocalScans() {
  localStorage.removeItem(SCANS_KEY);
}
