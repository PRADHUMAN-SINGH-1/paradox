import { supabase } from './auth.js';

const form=document.querySelector('#authForm');
const email=document.querySelector('#authEmail');
const password=document.querySelector('#authPassword');
const status=document.querySelector('#authStatus');
const title=document.querySelector('#authTitle');
const copy=document.querySelector('#authCopy');
const submit=document.querySelector('#authSubmit');
const toggle=document.querySelector('#toggleMode');
const github=document.querySelector('#githubAuth');
const reset=document.querySelector('#resetPassword');
let signUp=true;
const message=t=>{status.textContent=t};

if(!supabase){message('Authentication is not configured yet. The UI is ready; add the Supabase public URL and publishable key to GitHub Actions secrets.');}

toggle?.addEventListener('click',()=>{signUp=!signUp;title.textContent=signUp?'Join the shortlist.':'Welcome back.';copy.textContent=signUp?'Save agents, keep scan history, and build a private shortlist.':'Sign in to your saved agents and scan history.';submit.textContent=signUp?'CREATE ACCOUNT':'SIGN IN';password.autocomplete=signUp?'new-password':'current-password';toggle.textContent=signUp?'Already have an account? Sign in.':'Need an account? Create one.';});
form?.addEventListener('submit',async e=>{e.preventDefault();if(!supabase)return message('Supabase is not configured.');submit.disabled=true;message('Working…');
  const result=signUp?await supabase.auth.signUp({email:email.value.trim(),password:password.value,options:{emailRedirectTo:`${location.origin}/account/`}}):await supabase.auth.signInWithPassword({email:email.value.trim(),password:password.value});
  submit.disabled=false;
  if(result.error)return message(result.error.message);
  if(signUp&&!result.data.session)return message('Account created. Check your email to confirm the account.');
  location.href='/account/';
});
github?.addEventListener('click',async()=>{if(!supabase)return message('Supabase is not configured.');const {error}=await supabase.auth.signInWithOAuth({provider:'github',options:{redirectTo:`${location.origin}/account/`}});if(error)message(error.message);});
reset?.addEventListener('click',async()=>{if(!supabase)return message('Supabase is not configured.');const value=email.value.trim();if(!value)return message('Enter your email first.');const {error}=await supabase.auth.resetPasswordForEmail(value,{redirectTo:`${location.origin}/auth/`});message(error?error.message:'If an account exists, a reset email has been sent.');});
