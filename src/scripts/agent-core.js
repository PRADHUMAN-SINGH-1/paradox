const API='https://api.github.com';

export function parseRepo(value){
  try{
    const u=new URL(value.trim());
    if(u.hostname!=='github.com') throw new Error('Use a public github.com repository URL.');
    const parts=u.pathname.split('/').filter(Boolean);
    if(parts.length<2) throw new Error('That URL is not a repository.');
    return {owner:parts[0],repo:parts[1].replace(/\.git$/,'')};
  }catch(e){throw new Error(e.message||'Enter a valid GitHub repository URL.');}
}

async function api(path){
  const r=await fetch(`${API}${path}`,{headers:{Accept:'application/vnd.github+json'}});
  if(!r.ok) throw new Error(r.status===404?'Repository or file not found.':`GitHub API error ${r.status}.`);
  return r.json();
}

async function textFile(owner,repo,path){
  try{const x=await api(`/repos/${owner}/${repo}/contents/${path}`); if(Array.isArray(x)||!x.content)return ''; return atob(x.content.replace(/\n/g,''));}
  catch{return '';}
}

function daysSince(date){return Math.max(0,(Date.now()-new Date(date).getTime())/86400000);}
function scoreFreshness(days){return days<=7?100:days<=30?88:days<=90?70:days<=180?45:15;}
function flags(text){
  const patterns=[
    ['shell-exec','curl|sh|wget|sh -c|bash -c'],
    ['elevated-permissions','sudo ','sudo\\n'],
    ['secret-access','.env|secrets.|process.env|os.getenv'],
    ['dynamic-exec','eval\\(|exec\\(|child_process'],
    ['remote-install','pip install.*https?://|npm install.*https?://']
  ];
  return patterns.filter(([,p])=>new RegExp(p,'i').test(text)).map(([name])=>name);
}

export async function analyzeRepo(input){
  const {owner,repo}=parseRepo(input);
  const r=await api(`/repos/${owner}/${repo}`);
  const [langs,root,readme,pkg,req,pyproject,docker,workflow]=await Promise.all([
    api(`/repos/${owner}/${repo}/languages`).catch(()=>({})),
    api(`/repos/${owner}/${repo}/contents`).catch(()=>[]),
    textFile(owner,repo,'README.md'),textFile(owner,repo,'package.json'),textFile(owner,repo,'requirements.txt'),textFile(owner,repo,'pyproject.toml'),textFile(owner,repo,'Dockerfile'),textFile(owner,repo,'.github/workflows/ci.yml')
  ]);
  const names=(Array.isArray(root)?root:[]).map(x=>x.name.toLowerCase());
  const evidence=(`${readme}\n${pkg}\n${req}\n${pyproject}\n${docker}\n${workflow}`).slice(0,120000);
  const riskFlags=flags(evidence);
  const age=daysSince(r.pushed_at);
  const freshness=scoreFreshness(age);
  const documentation=readme.length>3000?100:readme.length>800?75:readme.length>200?45:10;
  const structure=[pkg&&'package.json',req&&'requirements.txt',pyproject&&'pyproject.toml',docker&&'Dockerfile',workflow&&'CI workflow'].filter(Boolean);
  const license=r.license?.spdx_id&&r.license.spdx_id!=='NOASSERTION';
  const activity=Math.min(100,Math.round((Math.log10(r.stargazers_count+1)*32)+(Math.log10(r.forks_count+1)*24)+(r.open_issues_count<20?20:10)));
  const health=Math.max(0,Math.min(100,Math.round(freshness*.3+activity*.2+documentation*.15+(license?100:25)*.1+Math.min(100,structure.length*20)*.1+(riskFlags.length?35:100)*.15)));
  const critical=riskFlags.filter(x=>['shell-exec','dynamic-exec','secret-access'].includes(x)).length;
  const verdict=critical>=2?'HIGH-RISK':freshness<40?'STALE':health>=72&&!critical?'PARADOX VERIFIED':'QUESTIONABLE';
  return {r,owner,repo,url:r.html_url,langs,riskFlags,freshness,documentation,health,verdict,license,structure,ageDays:Math.round(age),readmeLength:readme.length,stars:r.stargazers_count,forks:r.forks_count,issues:r.open_issues_count,defaultBranch:r.default_branch,hasActions:names.includes('.github'),updated:r.pushed_at,created:r.created_at};
}

export function renderAnalysis(x){
  const langs=Object.keys(x.langs||{}).slice(0,5);
  const flags=x.riskFlags.length?x.riskFlags.map(v=>`<li>${v}</li>`).join(''):'<li>No static indicators matched the current rules.</li>';
  const structure=x.structure.length?x.structure.map(v=>`<li>${v}</li>`).join(''):'<li>No common project config detected.</li>';
  return `<div class="result-head"><div><div class="badge">${x.owner}/${x.repo}</div><h2>${escapeHtml(x.r.name)}</h2><p>${escapeHtml(x.r.description||'No repository description provided.')}</p></div><div class="verdict">${x.verdict}</div></div><div class="metrics"><div class="metric"><span>HEALTH</span><b>${x.health}/100</b></div><div class="metric"><span>FRESHNESS</span><b>${x.freshness}/100</b></div><div class="metric"><span>STARS</span><b>${x.stars}</b></div><div class="metric"><span>OPEN ISSUES</span><b>${x.issues}</b></div></div><div class="columns"><div class="panel"><h3>REPOSITORY EVIDENCE</h3><ul><li>Last pushed ${x.ageDays} days ago</li><li>License: ${x.license?'detected':'not detected'}</li><li>README length: ${x.readmeLength.toLocaleString()} characters</li><li>Languages: ${langs.length?langs.join(', '):'not detected'}</li><li>Default branch: ${x.defaultBranch}</li></ul><a href="${x.url}" target="_blank" rel="noopener">OPEN GITHUB ↗</a></div><div class="panel"><h3>STATIC RISK INDICATORS</h3><ul>${flags}</ul><h3>DETECTED STACK FILES</h3><ul>${structure}</ul><small>This analysis is automated and limited to public repository evidence.</small></div></div><button class="save" data-save-url="${x.url}" data-save-name="${escapeAttr(x.r.name)}">SAVE TO MY SHORTLIST</button>`;
}
function escapeHtml(s){return String(s).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
function escapeAttr(s){return escapeHtml(s).replace(/'/g,'&#39;');}
export function metricSnapshot(x){return {url:x.url,name:x.r.name,score:x.health,verdict:x.verdict,freshness:x.freshness};}
