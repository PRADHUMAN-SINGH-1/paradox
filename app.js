(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (v) => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state = { receipt: [], predictionTarget: null, predictionPath: [], cup: null, card: null, cardChosen: null };

  function saveReceipt(type, data) {
    state.receipt.push({ type, data, at: new Date().toISOString() });
    try { sessionStorage.setItem('paradox-receipt', JSON.stringify(state.receipt)); } catch (_) {}
  }

  function scrollRooms() {
    $('#rooms')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function ensureOverlay() {
    let overlay = $('#overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'overlay';
      overlay.className = 'overlay';
      document.body.appendChild(overlay);
    }
    return overlay;
  }

  function closeRoom() {
    const overlay = $('#overlay');
    if (overlay) overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function scene(tag, title, intro, body) {
    const overlay = ensureOverlay();
    overlay.innerHTML = `
      <button class="close" aria-label="Close" onclick="closeRoom()">×</button>
      <div class="scene">
        <div class="tag">${tag}</div>
        <h2>${title}</h2>
        <p>${intro}</p>
        <div id="gameBody">${body}</div>
      </div>`;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    overlay.scrollTop = 0;
  }

  function openAbout() {
    scene('WHY PARADOX EXISTS', 'You choose. We keep the receipt.',
      'PARADOX is not here to diagnose you or pretend a browser can read your mind. It builds small, fair illusions around real choices.',
      `<div class="explain"><b>THE RULE</b><br>Effect first. Explanation second. Your clicks are never silently changed. When a method depends on a force, timing or framing, we show it after the reveal.</div>
       <div class="actions"><button onclick="closeRoom()">BACK TO THE LAB</button></div>`);
  }

  function openRoom(type) {
    if (type === 'prediction') return prediction();
    if (type === 'cups') return cups();
    if (type === 'card') return card();
    if (type === 'word') return word();
    if (type === 'shadow') return shadow();
    if (type === 'calm') return calmRoom();
  }

  // ROOM 01 — a real equivoque structure: the target is fixed before the first click.
  function prediction() {
    state.predictionTarget = Math.floor(Math.random() * 4);
    state.predictionPath = [];
    const suits = ['♠','♥','♣','♦'];
    scene('ROOM 01 · CHOICE', 'The Sealed Prediction',
      'One symbol was sealed before you touched the screen. Choose freely. I will never replace your choice behind your back.',
      `<div class="explain"><b>BEFORE YOU START</b><br>The prediction is already fixed. Your job is to try to make it fail.</div>
       <div class="choices">${suits.map((s,i)=>`<button class="choice ${i===1||i===3?'red':''}" onclick="predFirst(${i})" aria-label="${s}">${s}</button>`).join('')}</div>`);
  }

  function predFirst(i) {
    state.predictionPath.push(i);
    saveReceipt('prediction:first', i);
    const t = state.predictionTarget;
    if (i === t) {
      scene('THE COMMITMENT', 'Keep it or lose it?',
        'Your first choice landed directly on the sealed symbol.',
        `<div class="explain">You can <b>KEEP</b> your choice or deliberately <b>THROW IT AWAY</b>. Either action remains part of the receipt.</div>
         <div class="actions"><button onclick="predKeep()">KEEP ${suitsLabel(t)}</button><button class="alt" onclick="predThrow()">THROW IT AWAY</button></div>`);
    } else {
      scene('THE COMMITMENT', 'Remove three.',
        `You chose ${suitsLabel(i)}. That choice is locked. Now eliminate three symbols, one at a time.`,
        `<div class="choices">${['♠','♥','♣','♦'].map((s,j)=>`<button class="choice ${j===1||j===3?'red':''}" ${j===t||j===i?'disabled':''} onclick="predRemove(${j})">${s}</button>`).join('')}</div>
         <div class="explain">The sealed symbol is never moved. The route is the trick.</div>`);
      state.predictionRemaining = new Set([0,1,2,3].filter(j => j !== i));
      state.predictionRemaining.delete(t); // target stays protected, not clickable
    }
  }

  const suitsLabel = i => ['♠ Spades','♥ Hearts','♣ Clubs','♦ Diamonds'][i];

  function predRemove(i) {
    const t = state.predictionTarget;
    if (i === t) return;
    state.predictionPath.push(i);
    saveReceipt('prediction:remove', i);
    state.predictionRemaining?.delete(i);
    const remaining = [...(state.predictionRemaining || [])].filter(x => x !== t);
    if (remaining.length <= 0 || state.predictionPath.filter(x => x !== t).length >= 3) {
      return predictionReveal();
    }
    const candidates = [0,1,2,3].filter(x => x !== t && x !== state.predictionPath[0] && !state.predictionPath.includes(x));
    if (!candidates.length) return predictionReveal();
    scene('THE COMMITMENT', 'One more.', 'The choices you already made stay fixed. Choose one symbol to remove.',
      `<div class="choices">${['♠','♥','♣','♦'].map((s,j)=>`<button class="choice" ${j===t||state.predictionPath.includes(j)?'disabled':''} onclick="predRemove(${j})">${s}</button>`).join('')}</div>
       <div class="explain">Nothing has been swapped. We are simply changing what your next click means.</div>`);
  }

  function predKeep() { saveReceipt('prediction:keep', state.predictionTarget); predictionReveal(); }
  function predThrow() {
    saveReceipt('prediction:throw', state.predictionTarget);
    scene('A FAIR CHOICE', 'You threw it away.', 'Good. The sealed symbol remains sealed. Now make one last choice between the two survivors.',
      `<div class="choices">${[0,1,2,3].filter(i=>i !== state.predictionTarget).slice(0,2).map(i=>`<button class="choice" onclick="predLast(${i})">${['♠','♥','♣','♦'][i]}</button>`).join('')}</div>`);
  }
  function predLast(i) { saveReceipt('prediction:last', i); predictionReveal(); }
  function predictionReveal() {
    saveReceipt('prediction:reveal', state.predictionTarget);
    scene('THE RECEIPT', 'Open the envelope.', 'Your route is preserved. Here is what was fixed before you arrived.',
      `<div class="explain"><strong style="font:48px 'Instrument Serif';font-weight:400">${esc(suitsLabel(state.predictionTarget))}</strong><br><br>The prediction was committed first. The experience uses a magician’s-choice / equivoque structure: the same physical choice can lead to different continuations without changing what you clicked. That is the important distinction.</div>
       <div class="actions"><button onclick="prediction()">TRY TO BREAK IT AGAIN</button><button class="alt" onclick="receipt()">SHOW MY RECEIPT</button></div>`);
  }

  // ROOM 02 — actual moving bead with tracked position.
  function cups() {
    state.cup = 0;
    scene('ROOM 02 · ATTENTION', 'Three Cups',
      'Watch the red bead. You will get a chance to stop the sequence whenever you feel you have the location.',
      `<div id="cupStage" style="margin-top:36px">
        <div style="display:flex;gap:18px;justify-content:center;align-items:end;min-height:180px">
          ${[0,1,2].map(i=>`<button id="cup${i}" onclick="cupGuess(${i})" style="width:150px;height:125px;border:1px solid #8d867b;background:#1b1a17;color:#eee9df;border-radius:0 0 46px 46px;position:relative;font:15px 'DM Mono';transition:transform .55s ease">${String.fromCharCode(65+i)}<span style="display:${i===0?'block':'none'};position:absolute;width:24px;height:24px;background:#c9442e;border-radius:50%;left:50%;bottom:22px;transform:translateX(-50%)"></span></button>`).join('')}
        </div>
        <div id="cupStatus" class="explain">Press SHUFFLE and follow the bead. No trick click yet.</div>
        <div class="actions"><button onclick="shuffleCups()">SHUFFLE 7 TIMES</button><button class="alt" onclick="stopCups()">STOP THE FILM</button></div>
      </div>`);
  }

  function shuffleCups() {
    let pos = 0, count = 0;
    const positions = [1,2,0,2,1,0,1];
    const tick = setInterval(() => {
      pos = positions[count % positions.length];
      state.cup = pos;
      [0,1,2].forEach(i => {
        const el = $(`#cup${i}`); if (!el) return;
        el.style.transform = `translateY(${i===pos ? -8 : 0}px) rotate(${i===pos ? 0 : (i-count%2? -2:2)}deg)`;
        const bead = el.querySelector('span'); if (bead) bead.style.display = i===0 && count===0 ? 'block':'none';
      });
      const s = $('#cupStatus'); if (s) s.textContent = `Swap ${count+1} / 7 — keep watching.`;
      count++;
      if (count >= 7) {
        clearInterval(tick);
        const s2 = $('#cupStatus'); if (s2) s2.innerHTML = '<b>Now choose one.</b> Your eyes had a continuous story. The browser had seven discrete states.';
        saveReceipt('cups:shuffle', positions);
      }
    }, 520);
    state.cupTimer = tick;
  }

  function stopCups() {
    if (state.cupTimer) clearInterval(state.cupTimer);
    const s = $('#cupStatus'); if (s) s.innerHTML = '<b>Frozen.</b> Choose A, B or C.';
  }

  function cupGuess(i) {
    stopCups();
    saveReceipt('cups:guess', i);
    const hit = i === state.cup;
    scene('THE REVEAL', hit ? 'You caught it.' : 'Your eyes lost the thread.',
      hit ? 'That is harder than it looks.' : 'The feeling of continuity is doing most of the work.',
      `<div class="explain"><b>YOU PICKED ${String.fromCharCode(65+i)}.</b><br><br>The tracked position was ${String.fromCharCode(65+state.cup)}. The interesting part is not the miss; it is how smooth movement lets the brain interpolate what the screen never explicitly showed.</div><div class="actions"><button onclick="cups()">RUN IT AGAIN</button><button class="alt" onclick="receipt()">MY RECEIPT</button></div>`);
  }

  // ROOM 03 — card selection survives a real shuffle.
  function card() {
    const cards = ['A♠','K♥','Q♣','J♦','10♠','9♥','8♣','7♦','6♠','5♥','4♣','3♦'];
    state.card = [...cards].sort(()=>Math.random()-0.5);
    scene('ROOM 03 · CARDS', 'The Other Card',
      'Pick one card. Remember it. Then watch a real permutation happen around it.',
      `<div class="choices" style="grid-template-columns:repeat(4,1fr)">${state.card.map((c,i)=>`<button class="choice" style="font-size:42px;min-height:135px" onclick="cardChoose(${i})">${esc(c)}</button>`).join('')}</div>
       <div class="explain">No card is secretly selected for you. Your exact click is stored for the shuffle.</div>`);
  }

  function cardChoose(i) {
    state.cardChosen = state.card[i]; saveReceipt('card:choose', state.cardChosen);
    const before = [...state.card];
    const shuffled = [...state.card].sort(()=>Math.random()-0.5);
    state.card = shuffled;
    scene('THE SHUFFLE', 'Look at the middle.', 'Your card is still somewhere in the deck. Try to track it.',
      `<div id="cardDeck" class="choices" style="grid-template-columns:repeat(4,1fr)">${shuffled.map((c,j)=>`<button class="choice" style="font-size:30px;min-height:120px" onclick="cardReveal(${j})">${j+1}</button>`).join('')}</div>
       <div class="actions"><button onclick="cardReveal(-1)">I LOST IT</button></div>
       <div class="explain">The deck order changed from <b>${esc(before.join(' · '))}</b> to a new permutation. Your chosen card remains a member of the set.</div>`);
  }

  function cardReveal(i) {
    const location = state.card.findIndex(c => c === state.cardChosen);
    const guess = i >= 0 ? state.card[i] : null;
    saveReceipt('card:guess', { i, guess, location });
    scene('THE OTHER CARD', 'Turn one over.', 'Your card was never removed. But the deck can make location feel like identity.',
      `<div class="explain"><strong style="font:48px 'Instrument Serif';font-weight:400">${esc(state.cardChosen || '—')}</strong><br><br>Your chosen card is at position ${location+1} after the shuffle. ${guess ? `You clicked position ${i+1}, which was ${esc(guess)}.` : 'You chose to stop without a location guess.'}</div>
       <div class="actions"><button onclick="card()">SHUFFLE A NEW DECK</button><button class="alt" onclick="receipt()">MY RECEIPT</button></div>`);
  }

  // ROOM 04 — psychological forcing framed as a choice, then explained fairly.
  function word() {
    const words = ['MONSOON','MANGO','TRAIN','MIDNIGHT','RIVER','HOME','TEA','WINDOW','RAIN'];
    scene('ROOM 04 · MENTALISM', 'Don’t Say It',
      'Think of one word. Do not type it. Instead, follow two tiny decisions and see where they lead.',
      `<div class="explain">This is a forcing experiment, not mind reading. Your job is to notice which decisions feel more open than they really are.</div>
       <div class="actions"><button onclick="wordStep(0)">BEGIN THE FORCE ↗</button></div>`);
    state.words = words;
  }
  function wordStep(step) {
    if (step === 0) {
      scene('FIRST CUT', 'Pick one.', 'Do it quickly. Which feels most like a word you would choose?', `<div class="wordGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:32px">${['MONSOON','MANGO','TRAIN'].map(w=>`<button class="choice" style="font:24px 'DM Mono';min-height:110px" onclick="wordStep(1)">${w}</button>`).join('')}</div>`);
    } else {
      scene('SECOND CUT', 'Now one more.', 'Again, quickly. Notice whether the remaining options actually feel random.', `<div class="wordGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:32px">${['MONSOON','MIDNIGHT','RAIN'].map(w=>`<button class="choice" style="font:24px 'DM Mono';min-height:110px" onclick="wordReveal('${w}')">${w}</button>`).join('')}</div>`);
      saveReceipt('word:step', step);
    }
  }
  function wordReveal(word) {
    saveReceipt('word:reveal', word);
    scene('THE RECEIPT', 'You picked it.', 'And that is the point: the interface can create a surprising feeling of prediction without ever seeing inside your head.',
      `<div class="explain"><strong style="font:52px 'Instrument Serif';font-weight:400">${esc(word)}</strong><br><br>We did not know your silent thought. We controlled the menu of plausible next moves. That is a force, not telepathy.</div>
       <div class="actions"><button onclick="word()">TRY ANOTHER FORCE</button><button class="alt" onclick="receipt()">MY RECEIPT</button></div>`);
  }

  // ROOM 05 — interactive shadow / geometry puzzle.
  function shadow() {
    scene('ROOM 05 · VISION', 'The Second Shadow',
      'Move the lamp. Your job is to place the shadow where the object actually permits it to go.',
      `<div style="margin-top:30px;border:1px solid #aaa398;background:#ded7cc;min-height:330px;position:relative;overflow:hidden" id="shadowBoard">
        <div id="shadowObject" style="position:absolute;left:50%;top:42%;width:64px;height:64px;border:2px solid #151512;transform:translate(-50%,-50%) rotate(45deg)"></div>
        <div id="shadowProjection" style="position:absolute;left:50%;top:67%;width:180px;height:1px;background:#c9442e;transform-origin:left center;transform:rotate(-25deg)"></div>
        <input aria-label="Lamp angle" id="shadowRange" type="range" min="-65" max="65" value="-25" style="position:absolute;left:9%;right:9%;bottom:28px">
      </div>
      <div class="actions"><button onclick="shadowCheck()">CHECK THE GEOMETRY</button><button class="alt" onclick="shadow()">RESET</button></div>
      <div id="shadowNote" class="explain">The red line is the predicted shadow direction. Move the lamp first. Then commit.</div>`);
    const r = $('#shadowRange');
    const p = $('#shadowProjection');
    r?.addEventListener('input', () => { p.style.transform = `rotate(${r.value}deg)`; });
  }
  function shadowCheck() {
    const v = Number($('#shadowRange')?.value || 0);
    saveReceipt('shadow:angle', v);
    const note = $('#shadowNote');
    if (note) note.innerHTML = `<b>REVEAL:</b> ${Math.abs(v) < 12 ? 'The almost-straight shadow is plausible.' : 'The direction is visibly tied to the lamp angle.'}<br><br>The illusion comes from assuming the shadow is an independent object. It is only geometry cast by the object and the light source.`;
  }

  function calmRoom() {
    scene('CALM LAB · NO TRICK', 'Monsoon Room', 'A quiet minute. No score, no reveal.',
      `<div style="height:46vh;min-height:280px;background:linear-gradient(#88847b,#b9b2a5);position:relative;overflow:hidden;margin-top:35px">${Array.from({length:85},(_,i)=>`<i style="position:absolute;left:${Math.random()*100}%;top:${Math.random()*100}%;width:1px;height:${10+Math.random()*22}px;background:rgba(255,255,255,.42);transform:rotate(9deg);animation:paradoxRain ${.6+Math.random()*.9}s linear ${Math.random()*1.2}s infinite"></i>`).join('')}</div>
       <div class="actions"><button onclick="closeRoom()">LEAVE QUIETLY</button></div>
       <style>@keyframes paradoxRain{to{transform:translateY(50vh) rotate(9deg)}}</style>`);
  }

  function receipt() {
    let entries = state.receipt;
    try { entries = JSON.parse(sessionStorage.getItem('paradox-receipt') || '[]'); } catch (_) {}
    scene('YOUR RECEIPT', 'What actually happened.', 'A local, temporary record of the choices you made in this visit.',
      `<div class="explain">${entries.length ? entries.map((e,i)=>`<div style="padding:10px 0;border-bottom:1px solid rgba(21,21,18,.12)"><b>${i+1}. ${esc(e.type)}</b><br><span style="color:#625d56">${esc(JSON.stringify(e.data))}</span></div>`).join('') : 'No choices recorded yet.'}</div>
       <div class="actions"><button onclick="closeRoom()">BACK</button><button class="alt" onclick="clearReceipt()">CLEAR RECEIPT</button></div>`);
  }
  function clearReceipt() { state.receipt = []; try { sessionStorage.removeItem('paradox-receipt'); } catch (_) {} receipt(); }

  // Remove any legacy bindings from the previous prototype and use the new global API.
  window.scrollRooms = scrollRooms;
  window.openAbout = openAbout;
  window.openRoom = openRoom;
  window.closeRoom = closeRoom;
  window.predFirst = predFirst;
  window.predRemove = predRemove;
  window.predKeep = predKeep;
  window.predThrow = predThrow;
  window.predLast = predLast;
  window.cups = cups;
  window.shuffleCups = shuffleCups;
  window.stopCups = stopCups;
  window.cupGuess = cupGuess;
  window.card = card;
  window.cardChoose = cardChoose;
  window.cardReveal = cardReveal;
  window.word = word;
  window.wordStep = wordStep;
  window.wordReveal = wordReveal;
  window.shadow = shadow;
  window.shadowCheck = shadowCheck;
  window.calmRoom = calmRoom;
  window.receipt = receipt;
  window.clearReceipt = clearReceipt;

  document.addEventListener('DOMContentLoaded', () => {
    const sound = $('#soundBtn');
    if (sound) sound.addEventListener('click', () => {
      sound.textContent = sound.textContent.includes('OFF') ? 'SOUND ON' : 'SOUND OFF';
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRoom(); });
  });
})();
