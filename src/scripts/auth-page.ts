import { track } from '../lib/analytics.ts';
import { supabase } from '../lib/supabase.ts';

const form = document.querySelector<HTMLFormElement>('#authForm');
const email = document.querySelector<HTMLInputElement>('#authEmail');
const password = document.querySelector<HTMLInputElement>('#authPassword');
const status = document.querySelector('#authStatus');
const title = document.querySelector('#authTitle');
const copy = document.querySelector('#authCopy');
const submit = document.querySelector<HTMLButtonElement>('#authSubmit');
const toggle = document.querySelector('#toggleMode');
const github = document.querySelector('#githubAuth');
const reset = document.querySelector('#resetPassword');
let signUp = true;
const message = (t: string) => { if (status) status.textContent = t; };

if (!supabase) message('Authentication is not configured yet. Add PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY as GitHub Actions secrets.');

toggle?.addEventListener('click', () => {
  signUp = !signUp;
  if (title) title.textContent = signUp ? 'Save the agents you trust.' : 'Welcome back.';
  if (copy) copy.textContent = signUp ? 'Create an account to keep a shortlist and scan history. Discovery stays free.' : 'Sign in to your saved agents and scan history.';
  if (submit) submit.textContent = signUp ? 'Create account' : 'Sign in';
  if (password) password.autocomplete = signUp ? 'new-password' : 'current-password';
  if (toggle) toggle.textContent = signUp ? 'Already have an account? Sign in.' : 'Need an account? Create one.';
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase || !email || !password || !submit) return message('Authentication is not configured yet.');
  submit.disabled = true;
  if (signUp) track('signup_started');
  message('Working…');
  const redirect = new URLSearchParams(location.search).get('next') || '/dashboard/';
  const result = signUp
    ? await supabase.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: `${location.origin}/dashboard/` } })
    : await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  submit.disabled = false;
  if (result.error) return message(result.error.message);
  if (signUp && !result.data.session) {
    track('signup_completed');
    return message('Account created. Check your email to confirm the account.');
  }
  if (signUp) track('signup_completed');
  else track('login_completed');
  location.href = redirect.startsWith('/') ? redirect : '/dashboard/';
});

github?.addEventListener('click', async () => {
  if (!supabase) return message('Authentication is not configured yet.');
  track('signup_started');
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${location.origin}/dashboard/` } });
  if (error) message(error.message);
});

reset?.addEventListener('click', async () => {
  if (!supabase) return message('Authentication is not configured yet.');
  const value = email?.value.trim();
  if (!value) return message('Enter your email first.');
  const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${location.origin}/auth/` });
  message(error ? error.message : 'If an account exists, a reset email has been sent.');
});
