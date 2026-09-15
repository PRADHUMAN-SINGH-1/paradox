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
const google = document.querySelector('#googleAuth');
const reset = document.querySelector('#resetPassword');
const showPassword = document.querySelector<HTMLButtonElement>('#togglePassword');
let signUp = true;
const message = (t: string) => { if (status) status.textContent = t; };
const next = () => {
  const value = new URLSearchParams(location.search).get('next') || '/dashboard/';
  return value.startsWith('/') ? value : '/dashboard/';
};

if (!supabase) message('Authentication is not configured yet. Add the Supabase public URL and publishable key to the site environment.');

showPassword?.addEventListener('click', () => {
  if (!password || !showPassword) return;
  const visible = password.type === 'text';
  password.type = visible ? 'password' : 'text';
  showPassword.textContent = visible ? 'Show' : 'Hide';
  showPassword.setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
});

toggle?.addEventListener('click', () => {
  signUp = !signUp;
  if (title) title.textContent = signUp ? 'Create your PARADOX account.' : 'Welcome back to PARADOX.';
  if (copy) copy.textContent = signUp ? 'Sign up once to use PARADOX tools, verification, comparisons and private features.' : 'Sign in to continue to the PARADOX feature you were using.';
  if (submit) submit.textContent = signUp ? 'Create account' : 'Sign in';
  if (password) {
    password.autocomplete = signUp ? 'new-password' : 'current-password';
    password.value = '';
  }
  if (toggle) toggle.textContent = signUp ? 'Already have an account? Sign in.' : 'Need an account? Create one.';
  message('');
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!supabase || !email || !password || !submit) return message('Authentication is not configured yet.');
  submit.disabled = true;
  if (signUp) track('signup_started');
  message('Working…');
  const destination = next();
  const result = signUp
    ? await supabase.auth.signUp({ email: email.value.trim(), password: password.value, options: { emailRedirectTo: `${location.origin}/auth/?next=${encodeURIComponent(destination)}` } })
    : await supabase.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
  submit.disabled = false;
  if (result.error) return message(result.error.message);
  if (signUp && !result.data.session) {
    track('signup_completed');
    return message('Account created. Check your email to confirm, then return here to continue.');
  }
  if (signUp) track('signup_completed');
  else track('login_completed');
  location.href = destination;
});

async function oauth(provider: 'github' | 'google') {
  if (!supabase) return message('Authentication is not configured yet.');
  track('signup_started');
  message(`Connecting to ${provider === 'google' ? 'Google' : 'GitHub'}…`);
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${location.origin}/auth/?next=${encodeURIComponent(next())}` },
  });
  if (error) message(error.message);
}

github?.addEventListener('click', () => void oauth('github'));
google?.addEventListener('click', () => void oauth('google'));

reset?.addEventListener('click', async () => {
  if (!supabase) return message('Authentication is not configured yet.');
  const value = email?.value.trim();
  if (!value) return message('Enter your email first.');
  const { error } = await supabase.auth.resetPasswordForEmail(value, { redirectTo: `${location.origin}/auth/` });
  message(error ? error.message : 'If an account exists, a reset email has been sent.');
});
