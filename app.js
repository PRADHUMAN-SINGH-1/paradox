const modal=document.getElementById('modal'),game=document.getElementById('game');
const suits=[['♠','Spades'],['♥','Hearts'],['♣','Clubs'],['♦','Diamonds']];
const target=suits[Math.floor(Math.random()*suits.length)][0];
let live=[0,1,2,3],chosen=null;

function startTrick(){live=[0,1,2,3];chosen=null;modal.classList.add('open');modal.setAttribute('aria-hidden','false');renderStart()}
function closeTrick(){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
function card(i){return '<button class="playing" onclick="choose('+i+')"><span class="mark">'+suits[i][0]+'</span><small>'+suits[i][1]+'</small></button>'}
function renderStart(){game.innerHTML='<div class="game"><div class="game-top">PARADOX / THE SEALED PREDICTION</div><h2>One suit is already sealed.</h2><p>I made the prediction before you entered this room.</p><p>There are four cards. Pick the one your hand wants. No strategy.</p><div class="cards">'+live.map(card).join('')+'</div></div>'}

function choose(i){
 chosen=i;
 const isTarget=suits[i][0]===target;
 if(isTarget){
   game.innerHTML='<div class="game"><div class="game-top">DECISION 01 · LOCKED</div><h2>Keep that one.</h2><p>Interesting. Don’t touch it again.</p><div class="locked"><b>YOUR CHOICE IS SEALED.</b><br>'+suits[i][0]+' '+suits[i][1]+'</div><button class="continue" onclick="roundTwo()">Continue →</button></div>';
 }else{
   live=live.filter(x=>x!==i);
   game.innerHTML='<div class="game"><div class="game-top">DECISION 01 · LOCKED</div><h2>Fair. Let that one go.</h2><p>We won't use your first card. It stays out of the experiment.</p><div class="locked"><b>REMOVED</b><br>'+suits[i][0]+' '+suits[i][1]+'</div><button class="continue" onclick="roundTwo()">Continue →</button></div>';
 }
}
function roundTwo(){
 if(live.length===1){finish();return}
 game.innerHTML='<div class="game"><div class="game-top">DECISION 02</div><h2>Now choose again.</h2><p>Pick one of these. If it feels right, keep it. If not, we’ll take it out.</p><div class="cards">'+live.map(card).join('')+'</div></div>';
}
function choose(i){
 if(live.length===4){chosen=i; if(suits[i][0]===target){live=[i]}else{live=live.filter(x=>x!==i)}}
 else if(live.length===3){if(suits[i][0]===target){live=live.filter(x=>x!==i); /* target must be protected; move ambiguity to the instruction */ live=[i].concat(live.slice(0,1))}else{live=live.filter(x=>x!==i)}}
 else {live=[i]}
 if(live.length===1){finish();return}
 game.innerHTML='<div class="game"><div class="game-top">DECISION · NARROWING</div><h2>Good. Two roads left.</h2><p>One final choice. Point to the suit you would rather <b>leave on the table</b>.</p><div class="choice">'+live.map(i=>'<button onclick="last('+i+')">'+suits[i][0]+' '+suits[i][1]+'</button>').join('')+'</div></div>';
}
function last(i){
 if(suits[i][0]===target){live=[i]}else{live=[targetIndex()]}
 finish()
}
function targetIndex(){return suits.findIndex(s=>s[0]===target)}
function finish(){
 const t=targetIndex();
 game.innerHTML='<div class="game"><div class="game-top">THE SEALED PREDICTION</div><h2>Now open it.</h2><p>You made the last decision. The envelope has not changed.</p><div class="envelope" onclick="openEnvelope()"><div class="seal">OPEN</div></div><p style="text-align:center;font:11px DM Mono;color:#777">Tap the seal</p>';
 window._pred=t;
}
function openEnvelope(){
 const t=suits[window._pred];
 game.innerHTML='<div class="game"><div class="game-top">THE REVEAL</div><h2>There it is.</h2><div class="reveal"><h3>'+t[0]+' · '+t[1]+'.</h3><p>The prediction was fixed before your first click.</p></div><details class="method"><summary>How is this possible?</summary><p>This is the family of ideas magicians call <b>equivoque</b> or the magician’s choice. The performer gives choices that sound ordinary, but each possible answer has a prepared continuation. The object being protected can therefore survive every branch.</p><p>Nothing here reads your mind. The interesting part is psychological: <b>your brain experiences a controlled decision as a free one.</b></p></details><button class="again" onclick="startTrick()">Try to catch it again</button></div>';
}
