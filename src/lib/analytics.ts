declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type ProductEvent =
  | 'search'
  | 'search_result_click'
  | 'verify_started'
  | 'verify_completed'
  | 'verify_failed'
  | 'agent_opened'
  | 'compare_started'
  | 'compare_completed'
  | 'save_agent'
  | 'unsave_agent'
  | 'signup_started'
  | 'signup_completed'
  | 'login_completed'
  | 'github_clicked'
  | 'scan_history_opened';

const SENSITIVE = /password|token|secret|authorization|api[_-]?key/i;

export function track(event: ProductEvent, params: Record<string, string | number | undefined> = {}): void {
  const clean: Record<string, string | number> = { source_page: location.pathname };
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (SENSITIVE.test(k) || SENSITIVE.test(String(v))) continue;
    clean[k] = typeof v === 'number' ? v : String(v).slice(0, 180);
  }
  if (typeof window.gtag === 'function') window.gtag('event', event, clean);
}
