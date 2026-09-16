import { track } from '../lib/analytics.ts';
import { supabase } from '../lib/supabase.ts';
import { clearLocalScans, getLocalSavedAgents, getLocalScans, removeLocalAgent } from '../lib/local-state.ts';
import { toScore, STALE_AFTER_DAYS, VERDICT_COLOR, VERDICT_ORDER, daysAgo, filterAndSort, median, normalizeVerdict, numericScores, relativeTime, repoName as name, rowTime as rowDate, scoreTone, verdictCounts, type SortKey } from '../lib/dashboard-insights.ts';

type Row = Record<string, unknown>;

function esc(s: unknown): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

function el<T extends Element = Element>(sel: string): T | null {
  return document.querySelector<T>(sel);
}

const SKELETON = '<div class="dash-sk"><span class="s1"></span><span class="s2"></span><span class="s3"></span></div>';

function showSkeletons(target: Element | null, n = 4): void {
  if (target) target.innerHTML = Array.from({ length: n }, () => SKELETON).join('');
}

function renderLoadError(target: Element | null, message: string, retry: () => void): void {
  if (!target) return;
  target.innerHTML = `<div class="muted"><strong>Couldn't load this section.</strong>${esc(message)} <button type="button" data-retry>Retry</button></div>`;
  target.querySelector<HTMLButtonElement>('[data-retry]')?.addEventListener('click', retry);
}

/* ---------- derived insight helpers ---------- */





function scoreChip(score: unknown): string {
  const n = toScore(score);
  if (n === null) {
    return '<div class="score-chip" style="background:#141b17;color:#7f8d85;border-color:#27322d">—<small>SCORE</small></div>';
  }
  const tone = scoreTone(n);
  const color = tone === 'good' ? '#d9ff3f' : tone === 'warn' ? '#ffc861' : '#ff6a52';
  return `<div class="score-chip" style="background:${color}1a;color:${color};border-color:${color}55">${n}<small>SCORE</small></div>`;
}

function verdictTag(verdict: string): string {
  const color = VERDICT_COLOR[verdict] || VERDICT_COLOR.UNKNOWN;
  return `<span class="verdict-tag" style="background:${color}1a;color:${color}">${esc(verdict)}</span>`;
}





/* ---------- metrics + evidence mix ---------- */

function updateMetrics(saved: Row[], history: Row[], mode: 'SYNCED' | 'LOCAL' | 'UNAVAILABLE'): void {
  const savedEl = el('#savedCount');
  const historyEl = el('#historyCount');
  const workspace = el('#workspaceMode');
  const avg = el('#avgScore');
  const avgNote = el('#avgScoreNote');

  if (savedEl) savedEl.textContent = String(saved.length);
  if (historyEl) historyEl.textContent = String(history.length);
  if (workspace) workspace.textContent = mode;

  const med = median(numericScores(saved.length ? saved : history));
  if (avg) avg.textContent = med === null ? '—' : String(med);
  if (avgNote) {
    avgNote.textContent = med === null
      ? 'no scored items yet'
      : saved.length
        ? 'across saved agents'
        : 'across scan history';
  }
  renderEvidenceMix(saved.length ? saved : history);
  renderNextAction(saved, history);
}

function renderEvidenceMix(rows: Row[]): void {
  const section = el<HTMLElement>('#insightSection');
  const bar = el('#verdictBar');
  const legend = el('#verdictLegend');
  const note = el('#attentionNote');
  if (!section || !bar || !legend) return;

  if (!rows.length) {
    section.hidden = true;
    return;
  }
  section.hidden = false;

  const counts = verdictCounts(rows);
  const present = VERDICT_ORDER.filter((v) => counts.has(v));
  const total = rows.length;

  bar.innerHTML = present
    .map((v) => {
      const pct = ((counts.get(v)! / total) * 100).toFixed(2);
      return `<i style="width:${pct}%;background:${VERDICT_COLOR[v]}" title="${esc(v)}: ${counts.get(v)}"></i>`;
    })
    .join('');

  legend.innerHTML = present
    .map((v) => `<li><b style="background:${VERDICT_COLOR[v]}"></b>${esc(v)} <em>${counts.get(v)}</em></li>`)
    .join('');

  const needsAttention = (counts.get('HIGH-RISK') || 0) + (counts.get('QUESTIONABLE') || 0);
  const stale = rows.filter((r) => (daysAgo(r) ?? 0) > STALE_AFTER_DAYS).length;
  const parts: string[] = [];
  if (needsAttention) parts.push(`${needsAttention} need review`);
  if (stale) parts.push(`${stale} older than ${STALE_AFTER_DAYS} days`);
  if (note) note.textContent = parts.join(' · ');
}

function renderNextAction(saved: Row[], history: Row[]): void {
  const action = el('#nextAction');
  const note = el('#nextActionNote');
  if (!action || !note) return;

  const stale = saved.filter((r) => (daysAgo(r) ?? 0) > STALE_AFTER_DAYS);
  const risky = saved.filter((r) => ['HIGH-RISK', 'QUESTIONABLE'].includes(normalizeVerdict(r.verdict)));

  if (!saved.length && !history.length) {
    action.textContent = 'Run your first scan';
    note.textContent = 'Verify a public GitHub repository to start building your evidence workspace.';
  } else if (risky.length) {
    action.textContent = `Review ${risky.length} flagged ${risky.length === 1 ? 'repository' : 'repositories'}`;
    note.textContent = 'Some saved agents carry risk or review signals. Re-open them to check the evidence.';
  } else if (stale.length) {
    action.textContent = `Re-scan ${stale.length} stale ${stale.length === 1 ? 'entry' : 'entries'}`;
    note.textContent = `Evidence older than ${STALE_AFTER_DAYS} days may no longer reflect the repository.`;
  } else if (!saved.length) {
    action.textContent = 'Save what matters';
    note.textContent = 'You have scan history but nothing saved. Save the repositories worth revisiting.';
  } else {
    action.textContent = 'Keep building evidence';
    note.textContent = 'Verify projects, compare candidates, and save the ones worth revisiting.';
  }
}

/* ---------- list rendering with filter + sort ---------- */

let savedRows: Row[] = [];
let historyRows: Row[] = [];


function applySavedView(): void {
  const target = el('#savedAgents');
  const toolbar = el<HTMLElement>('#savedToolbar');
  const shown = el('#savedShown');
  if (!target) return;

  if (!savedRows.length) {
    if (toolbar) toolbar.hidden = true;
    target.innerHTML = '<p class="muted"><strong>Nothing saved yet.</strong>Verify an agent, then save it to keep it here. <a href="/verify/">Verify a repository →</a></p>';
    if (shown) shown.textContent = '';
    return;
  }
  if (toolbar) toolbar.hidden = false;

  const q = (el<HTMLInputElement>('#savedFilter')?.value || '').trim().toLowerCase();
  const sort = el<HTMLSelectElement>('#savedSort')?.value || 'recent';

  const view = filterAndSort(savedRows, q, sort as SortKey);

  if (shown) shown.textContent = q ? `${view.length} of ${savedRows.length}` : `${savedRows.length} saved`;

  if (!view.length) {
    target.innerHTML = `<p class="muted"><strong>No matches for "${esc(q)}".</strong>Try a different repository name.</p>`;
    return;
  }

  target.innerHTML = view
    .map((x, i) => {
      const n = name(x);
      const verdict = normalizeVerdict(x.verdict);
      const d = daysAgo(x);
      const stale = d !== null && d > STALE_AFTER_DAYS ? '<span class="stale-flag">STALE</span>' : '';
      return `<article class="card is-revealing" style="--i:${i}">
        <div class="card-top">
          <div style="min-width:0">${verdictTag(verdict)}<h3>${esc(n)}</h3></div>
          ${scoreChip(x.score)}
        </div>
        <p>Saved ${esc(relativeTime(x))}${stale}</p>
        <div class="links">
          <a href="/agents/view/?repo=${encodeURIComponent(n)}">Open</a>
          <a href="/verify/?url=${encodeURIComponent(String(x.repository_url || `https://github.com/${n}`))}">Re-scan</a>
          <button type="button" data-unsave="${esc(String(x.id || n))}">Remove</button>
        </div>
      </article>`;
    })
    .join('');

  target.querySelectorAll<HTMLButtonElement>('[data-unsave]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Two-step confirm: removal is destructive and was previously immediate.
      if (btn.dataset.confirm !== 'yes') {
        btn.dataset.confirm = 'yes';
        btn.textContent = 'Confirm remove';
        btn.classList.add('is-confirming');
        window.setTimeout(() => {
          if (btn.isConnected && btn.dataset.confirm === 'yes') {
            btn.dataset.confirm = '';
            btn.textContent = 'Remove';
            btn.classList.remove('is-confirming');
          }
        }, 4000);
        return;
      }
      void (async () => {
        try {
          const id = btn.dataset.unsave || '';
          if (!supabase || id.includes('/')) {
            removeLocalAgent(id);
            void boot();
            return;
          }
          const { error } = await supabase.from('saved_agents').delete().eq('id', id);
          if (error) {
            btn.textContent = 'Retry remove';
            return;
          }
          track('unsave_agent');
          void boot();
        } catch {
          btn.textContent = 'Retry remove';
        }
      })();
    });
  });
}

function applyHistoryView(): void {
  const target = el('#scanHistory');
  const toolbar = el<HTMLElement>('#historyToolbar');
  const shown = el('#historyShown');
  if (!target) return;

  if (!historyRows.length) {
    if (toolbar) toolbar.hidden = true;
    target.innerHTML = '<p class="muted"><strong>No scans stored yet.</strong>Every repository you verify will be listed here. <a href="/verify/">Run a scan →</a></p>';
    if (shown) shown.textContent = '';
    return;
  }
  if (toolbar) toolbar.hidden = false;

  const q = (el<HTMLInputElement>('#historyFilter')?.value || '').trim().toLowerCase();
  const view = filterAndSort(historyRows, q, 'recent');

  if (shown) shown.textContent = q ? `${view.length} of ${historyRows.length}` : `${historyRows.length} scans`;

  if (!view.length) {
    target.innerHTML = `<p class="muted"><strong>No matches for "${esc(q)}".</strong>Try a different repository name.</p>`;
    return;
  }

  target.innerHTML = view
    .map((x, i) => {
      const n = name(x);
      return `<article class="card is-revealing" style="--i:${i}">
        <div class="card-top">
          <div style="min-width:0">${verdictTag(normalizeVerdict(x.verdict))}<h3>${esc(n)}</h3></div>
          ${scoreChip(x.score)}
        </div>
        <p>Scanned ${esc(relativeTime(x))}</p>
        <div class="links">
          <a href="/verify/?url=${encodeURIComponent(String(x.repository_url || `https://github.com/${n}`))}">Open again</a>
        </div>
      </article>`;
    })
    .join('');
}

/* ---------- boot ---------- */

function localMode(): void {
  const email = el('#accountEmail');
  const profileEmail = el('#profileEmail');
  savedRows = getLocalSavedAgents().map((x) => ({ ...x, local: true }));
  historyRows = getLocalScans().map((x) => ({ ...x, repository_url: `https://github.com/${x.repository}` }));
  if (email) email.textContent = 'Local device mode — sign in to sync across devices.';
  if (profileEmail) profileEmail.textContent = 'No authenticated session is active. Local results remain on this device until you sign in.';
  updateMetrics(savedRows, historyRows, 'LOCAL');
  applySavedView();
  applyHistoryView();
}

async function boot(): Promise<void> {
  const email = el('#accountEmail');
  const profileEmail = el('#profileEmail');
  const saved = el('#savedAgents');
  const history = el('#scanHistory');

  showSkeletons(saved);
  showSkeletons(history, 3);

  if (!supabase) {
    localMode();
    return;
  }

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
  try {
    user = (await supabase.auth.getUser()).data.user ?? null;
  } catch {
    updateMetrics([], [], 'UNAVAILABLE');
    renderLoadError(saved, 'Authentication could not be checked.', boot);
    renderLoadError(history, 'Authentication could not be checked.', boot);
    if (email) email.textContent = 'Authentication unavailable';
    return;
  }
  if (!user) {
    localMode();
    return;
  }

  const identity = user.email || user.id;
  if (email) email.textContent = identity;
  if (profileEmail) profileEmail.textContent = `Signed in as ${identity}. This account is the owner of your saved agents and scan history.`;
  track('scan_history_opened');

  const [savedResult, historyResult] = await Promise.all([
    supabase.from('saved_agents').select('*').order('created_at', { ascending: false }).limit(100),
    supabase.from('scan_history').select('*').order('created_at', { ascending: false }).limit(100),
  ]);

  savedRows = savedResult.data || [];
  historyRows = historyResult.data || [];
  updateMetrics(savedRows, historyRows, savedResult.error || historyResult.error ? 'UNAVAILABLE' : 'SYNCED');

  if (savedResult.error) renderLoadError(saved, savedResult.error.message, boot);
  else applySavedView();

  if (historyResult.error) renderLoadError(history, historyResult.error.message, boot);
  else applyHistoryView();
}

/* ---------- controls ---------- */

let filterTimer = 0;
function debouncedRerender(fn: () => void): void {
  window.clearTimeout(filterTimer);
  filterTimer = window.setTimeout(fn, 120);
}

el('#savedFilter')?.addEventListener('input', () => debouncedRerender(applySavedView));
el('#savedSort')?.addEventListener('change', applySavedView);
el('#historyFilter')?.addEventListener('input', () => debouncedRerender(applyHistoryView));

el('#signOut')?.addEventListener('click', async () => {
  try {
    if (supabase) await supabase.auth.signOut();
  } finally {
    location.href = '/';
  }
});

// Clearing history is irreversible, so require an explicit second click.
const clearBtn = el<HTMLButtonElement>('#clearHistory');
clearBtn?.addEventListener('click', async () => {
  if (clearBtn.dataset.confirm !== 'yes') {
    clearBtn.dataset.confirm = 'yes';
    clearBtn.textContent = 'Confirm clear';
    clearBtn.classList.add('is-confirming');
    window.setTimeout(() => {
      if (clearBtn.dataset.confirm === 'yes') {
        clearBtn.dataset.confirm = '';
        clearBtn.textContent = 'Clear history';
        clearBtn.classList.remove('is-confirming');
      }
    }, 4000);
    return;
  }
  clearBtn.dataset.confirm = '';
  clearBtn.textContent = 'Clear history';
  clearBtn.classList.remove('is-confirming');
  try {
    if (!supabase) {
      clearLocalScans();
      void boot();
      return;
    }
    let user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user'] = null;
    try {
      user = (await supabase.auth.getUser()).data.user ?? null;
    } catch {
      clearLocalScans();
      void boot();
      return;
    }
    if (!user) {
      clearLocalScans();
      void boot();
      return;
    }
    const { error } = await supabase.from('scan_history').delete().eq('user_id', user.id);
    if (!error) void boot();
  } catch {
    /* keep current dashboard state */
  }
});

void boot();
