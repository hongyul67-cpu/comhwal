/* 컴활 1급 필기 개념게임 - 엔진 */
'use strict';

const DATA = window.COMHWAL_DATA || {};
const SUBJECT_ORDER = ['comp', 'excel', 'access'];
const STORE_KEY = 'comhwal_progress_v1';

let state = {
  subject: 'comp',
  unit: null,      // unit object
  mode: null,
  // 게임 진행
  queue: [],
  idx: 0,
  score: 0,
  combo: 0,
  correct: 0,
  wrong: 0,
  answered: false,
};

/* ---------- 저장/진행 ---------- */
function loadProg() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch (e) { return {}; }
}
function saveProg(p) { localStorage.setItem(STORE_KEY, JSON.stringify(p)); }
let PROG = loadProg();
// 구조: PROG = { totXp, totStar, units:{ 'comp/sys':{best, stars, xp} } }
PROG.units = PROG.units || {};
PROG.totXp = PROG.totXp || 0;
PROG.totStar = PROG.totStar || 0;

function unitKey(subj, unitId) { return subj + '/' + unitId; }

function recordResult(pct, xpGain) {
  const key = unitKey(state.subject, state.unit.id);
  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
  const rec = PROG.units[key] || { best: 0, stars: 0, xp: 0 };
  const newStars = Math.max(rec.stars, stars);
  PROG.totStar += (newStars - rec.stars);      // 별은 최고기록 증가분만 누적
  rec.best = Math.max(rec.best, pct);
  rec.stars = newStars;
  rec.xp += xpGain;
  PROG.units[key] = rec;
  PROG.totXp += xpGain;
  saveProg(PROG);
  updateHeader();
}

function updateHeader() {
  document.getElementById('totStar').textContent = PROG.totStar;
  document.getElementById('totXp').textContent = PROG.totXp;
}

/* ---------- 유틸 ---------- */
const $ = (id) => document.getElementById(id);
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function toast(txt, color) {
  const t = $('toast');
  t.textContent = txt;
  t.style.color = color || 'var(--gold)';
  t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
}

/* ---------- 홈 렌더 ---------- */
function renderSubjects() {
  const box = $('subjects');
  box.innerHTML = '';
  SUBJECT_ORDER.forEach(sid => {
    const s = DATA[sid];
    if (!s) return;
    const el = document.createElement('div');
    el.className = 'subject' + (sid === state.subject ? ' on' : '') + (s.ready ? '' : ' soon');
    el.innerHTML = `<div class="ico">${s.icon}</div><div class="nm">${s.name}</div>
      <div class="st">${s.ready ? s.units.length + '개 단원' : '준비 중'}</div>
      ${s.ready ? '' : '<div class="soonlab">SOON</div>'}`;
    if (s.ready) el.onclick = () => { state.subject = sid; renderHome(); };
    box.appendChild(el);
  });
}

function renderUnits() {
  const s = DATA[state.subject];
  const box = $('units');
  box.innerHTML = '';
  $('unitTitle').textContent = s.name + ' · 단원 선택';
  s.units.forEach(u => {
    const key = unitKey(state.subject, u.id);
    const rec = PROG.units[key] || { best: 0, stars: 0 };
    const nQ = (u.quiz ? u.quiz.length : 0) + (u.ox ? u.ox.length : 0);
    const starTxt = '★★★'.slice(0, rec.stars) + '☆☆☆'.slice(0, 3 - rec.stars);
    const el = document.createElement('div');
    el.className = 'unit';
    el.innerHTML = `<div class="star">${rec.stars ? starTxt : ''}</div>
      <div class="uico">${u.icon}</div>
      <div class="unm">${u.name}</div>
      <div class="cnt">카드 ${u.cards.length} · 문제 ${nQ}</div>
      <div class="bar"><i style="width:${rec.best}%"></i></div>`;
    el.onclick = () => openUnit(u);
    box.appendChild(el);
  });
}

function renderHome() {
  hide('modeSel'); hide('game'); hide('result'); show('home');
  renderSubjects();
  renderUnits();
}
function goHome() { renderHome(); }

/* ---------- 모드 선택 ---------- */
function openUnit(u) {
  state.unit = u;
  hide('home'); hide('game'); hide('result'); show('modeSel');
  $('modeUnitName').textContent = DATA[state.subject].icon + ' ' + u.name;
}

/* ---------- 게임 공통 ---------- */
function beginGame(mode, label) {
  state.mode = mode;
  state.idx = 0; state.score = 0; state.combo = 0;
  state.correct = 0; state.wrong = 0; state.answered = false;
  state.startTime = Date.now();
  hide('modeSel'); hide('home'); hide('result'); show('game');
  $('gameLabel').textContent = label;
  hide('nextBtn');
}
function updateHud(total) {
  $('hudLeft').textContent = (state.idx + 1) + ' / ' + total;
  $('pgFill').style.width = ((state.idx) / total * 100) + '%';
  $('hudScore').textContent = state.score + '점';
  const c = $('hudCombo');
  if (state.combo >= 2) { c.classList.remove('hidden'); c.textContent = '🔥 ' + state.combo; }
  else c.classList.add('hidden');
}
function quitGame() {
  if (state.mode === 'cards' || confirm('게임을 그만두시겠어요? 진행 중인 점수는 저장되지 않아요.'))
    openUnit(state.unit);
}

/* ============ 1) 개념 카드 ============ */
function startCards() {
  beginGame('cards', '🃏 개념 카드');
  state.queue = state.unit.cards.slice();
  $('hudScore').classList.add('hidden');
  renderCard();
}
function renderCard() {
  const total = state.queue.length;
  const c = state.queue[state.idx];
  updateHud(total);
  $('hudScore').classList.add('hidden');
  $('hudCombo').classList.add('hidden');
  $('stage').innerHTML = `
    <div class="flip"><div class="flipinner" id="flipEl" onclick="flipCard()">
      <div class="face front"><div class="tlabel">용어</div><div class="term">${c.t}</div>
        <div class="hint">👆 탭하면 설명이 나와요</div></div>
      <div class="face back"><div class="tlabel">설명</div><div class="def">${c.d}</div></div>
    </div></div>
    <div class="row" style="gap:10px">
      <button class="btn ghost" style="flex:1" onclick="prevCard()" ${state.idx === 0 ? 'disabled' : ''}>← 이전</button>
      <button class="btn" style="flex:1" onclick="nextCard()">${state.idx === total - 1 ? '완료 ✓' : '다음 →'}</button>
    </div>`;
}
function flipCard() { $('flipEl').classList.toggle('flipped'); }
function prevCard() { if (state.idx > 0) { state.idx--; renderCard(); } }
function nextCard() {
  if (state.idx < state.queue.length - 1) { state.idx++; renderCard(); }
  else {
    // 학습 완료 - 소량 XP
    recordResult(0, state.queue.length * 2);
    showSimpleDone('🃏', '카드 학습 완료!', '개념 ' + state.queue.length + '개를 훑어봤어요', state.queue.length * 2);
  }
}

/* ============ 2) 스피드 퀴즈 (4지선다 + 타이머) ============ */
let quizTimer = null, quizTimeLeft = 0;
function startQuiz() {
  beginGame('quiz', '⚡ 스피드 퀴즈');
  $('hudScore').classList.remove('hidden');
  const items = shuffle(state.unit.quiz).map(q => {
    // 보기 순서 섞기 (정답 추적)
    const opts = q.o.map((t, i) => ({ t, correct: i === q.a }));
    const sh = shuffle(opts);
    return { q: q.q, opts: sh, ans: sh.findIndex(o => o.correct), ex: q.ex };
  });
  state.queue = items;
  renderQuiz();
}
function renderQuiz() {
  const total = state.queue.length;
  const item = state.queue[state.idx];
  state.answered = false;
  updateHud(total);
  const opts = item.opts.map((o, i) =>
    `<div class="opt" data-i="${i}" onclick="answerQuiz(${i})">
       <div class="k">${'ABCD'[i]}</div><div>${o.t}</div></div>`).join('');
  $('stage').innerHTML = `
    <div class="qcard">
      <div class="row" style="justify-content:space-between">
        <div class="qnum">Q${state.idx + 1}</div>
        <div class="qnum" id="timerLab">⏱ 20</div>
      </div>
      <div class="qtext">${item.q}</div>
      <div class="opts" id="opts">${opts}</div>
      <div id="expBox"></div>
    </div>`;
  hide('nextBtn');
  startQuizTimer();
}
function startQuizTimer() {
  clearInterval(quizTimer);
  quizTimeLeft = 20;
  $('timerLab').textContent = '⏱ 20';
  quizTimer = setInterval(() => {
    quizTimeLeft--;
    const lab = $('timerLab');
    if (lab) lab.textContent = '⏱ ' + quizTimeLeft;
    if (quizTimeLeft <= 5 && lab) lab.style.color = 'var(--no)';
    if (quizTimeLeft <= 0) { clearInterval(quizTimer); answerQuiz(-1); }
  }, 1000);
}
function answerQuiz(sel) {
  if (state.answered) return;
  state.answered = true;
  clearInterval(quizTimer);
  const item = state.queue[state.idx];
  const correct = sel === item.ans;
  document.querySelectorAll('#opts .opt').forEach((el, i) => {
    el.classList.add('locked');
    el.onclick = null;
    if (i === item.ans) el.classList.add('correct');
    else if (i === sel) el.classList.add('wrong');
    else el.classList.add('dim');
  });
  if (correct) {
    state.combo++; state.correct++;
    const bonus = Math.max(0, quizTimeLeft) * 2;           // 빨리 맞출수록 보너스
    const comboBonus = (state.combo - 1) * 5;
    const gain = 10 + bonus + comboBonus;
    state.score += gain;
    toast('정답! +' + gain, 'var(--ok)');
  } else {
    state.combo = 0; state.wrong++;
    toast(sel === -1 ? '시간 초과!' : '오답', 'var(--no)');
  }
  $('hudScore').textContent = state.score + '점';
  $('expBox').innerHTML = `<div class="exp ${correct ? 'ok' : 'no'}">
    <b>${correct ? '✅ 정답' : '❌ ' + (sel === -1 ? '시간 초과' : '오답')}</b>${item.ex}</div>`;
  show('nextBtn');
  $('nextBtn').textContent = state.idx === state.queue.length - 1 ? '결과 보기 →' : '다음 →';
}

/* ============ 3) OX 퀴즈 ============ */
function startOX() {
  beginGame('ox', '⭕ OX 퀴즈');
  $('hudScore').classList.remove('hidden');
  state.queue = shuffle(state.unit.ox);
  renderOX();
}
function renderOX() {
  const total = state.queue.length;
  const item = state.queue[state.idx];
  state.answered = false;
  updateHud(total);
  $('stage').innerHTML = `
    <div class="qcard">
      <div class="qnum">Q${state.idx + 1} · 맞으면 O, 틀리면 X</div>
      <div class="qtext" style="min-height:80px;display:flex;align-items:center">${item.s}</div>
      <div class="oxbtns">
        <button class="oxbtn o" data-v="true" onclick="answerOX(true)">O</button>
        <button class="oxbtn x" data-v="false" onclick="answerOX(false)">X</button>
      </div>
      <div id="expBox"></div>
    </div>`;
  hide('nextBtn');
}
function answerOX(val) {
  if (state.answered) return;
  state.answered = true;
  const item = state.queue[state.idx];
  const correct = val === item.a;
  document.querySelectorAll('.oxbtn').forEach(b => {
    b.onclick = null;
    const bv = b.dataset.v === 'true';
    if (bv === item.a) b.classList.add('correct');
    else if (bv === val) b.classList.add('wrong');
  });
  if (correct) {
    state.combo++; state.correct++;
    const gain = 10 + (state.combo - 1) * 5;
    state.score += gain;
    toast('정답! +' + gain, 'var(--ok)');
  } else {
    state.combo = 0; state.wrong++;
    toast('오답', 'var(--no)');
  }
  $('hudScore').textContent = state.score + '점';
  $('expBox').innerHTML = `<div class="exp ${correct ? 'ok' : 'no'}">
    <b>${correct ? '✅ 정답 (' + (item.a ? 'O' : 'X') + ')' : '❌ 오답 (정답: ' + (item.a ? 'O' : 'X') + ')'}</b>${item.ex}</div>`;
  show('nextBtn');
  $('nextBtn').textContent = state.idx === state.queue.length - 1 ? '결과 보기 →' : '다음 →';
}

/* ============ 4) 용어 매칭 ============ */
let matchSel = null, matchDone = 0, matchTotal = 0, matchTries = 0;
function startMatch() {
  beginGame('match', '🔗 용어 매칭');
  $('hudScore').classList.add('hidden');
  $('hudCombo').classList.add('hidden');
  const pool = shuffle(state.unit.cards).slice(0, 5); // 한 판 5쌍
  matchTotal = pool.length; matchDone = 0; matchTries = 0; matchSel = null;
  const lefts = shuffle(pool.map((c, i) => ({ id: i, txt: c.t })));
  const rights = shuffle(pool.map((c, i) => ({ id: i, txt: c.d })));
  $('hudLeft').textContent = '0 / ' + matchTotal + ' 쌍';
  $('pgFill').style.width = '0%';
  $('stage').innerHTML = `
    <div class="matchgrid">
      <div class="mcol" id="mLeft">${lefts.map(l =>
        `<div class="mitem" data-side="L" data-id="${l.id}" onclick="pickMatch(this)">${l.txt}</div>`).join('')}</div>
      <div class="mcol" id="mRight">${rights.map(r =>
        `<div class="mitem" data-side="R" data-id="${r.id}" onclick="pickMatch(this)">${r.txt}</div>`).join('')}</div>
    </div>
    <div style="text-align:center;color:var(--tx2);font-size:13px;margin-top:14px">
      왼쪽 용어와 오른쪽 설명을 짝지어 보세요</div>`;
  hide('nextBtn');
}
function pickMatch(el) {
  if (el.classList.contains('done')) return;
  if (!matchSel) {
    matchSel = el; el.classList.add('sel'); return;
  }
  if (matchSel === el) { el.classList.remove('sel'); matchSel = null; return; }
  if (matchSel.dataset.side === el.dataset.side) { // 같은 쪽 다시 선택 → 교체
    matchSel.classList.remove('sel'); matchSel = el; el.classList.add('sel'); return;
  }
  matchTries++;
  if (matchSel.dataset.id === el.dataset.id) { // 정답
    matchSel.classList.add('done'); el.classList.add('done');
    matchSel.classList.remove('sel');
    matchSel = null; matchDone++;
    $('hudLeft').textContent = matchDone + ' / ' + matchTotal + ' 쌍';
    $('pgFill').style.width = (matchDone / matchTotal * 100) + '%';
    toast('짝!', 'var(--ok)');
    if (matchDone === matchTotal) {
      const acc = Math.round(matchTotal / matchTries * 100);
      const xp = matchTotal * 4;
      recordResult(acc, xp);
      setTimeout(() => showSimpleDone('🔗', '매칭 완료!',
        '정확도 ' + acc + '% · 시도 ' + matchTries + '회', xp), 400);
    }
  } else { // 오답
    const a = matchSel, b = el;
    a.classList.add('bad'); b.classList.add('bad');
    a.classList.remove('sel');
    matchSel = null;
    setTimeout(() => { a.classList.remove('bad'); b.classList.remove('bad'); }, 350);
  }
}

/* ============ 결과 화면 ============ */
function nextStep() {
  if (state.idx < state.queue.length - 1) {
    state.idx++;
    if (state.mode === 'quiz') renderQuiz();
    else if (state.mode === 'ox') renderOX();
  } else {
    finishQuizLike();
  }
}
function finishQuizLike() {
  const total = state.correct + state.wrong;
  const pct = total ? Math.round(state.correct / total * 100) : 0;
  const xp = state.correct * 5 + Math.floor(state.score / 10);
  recordResult(pct, xp);
  state.lastResult = { total, pct };
  const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 40 ? 1 : 0;
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '👍' : '💪';
  const msg = pct >= 90 ? '완벽해요!' : pct >= 70 ? '잘했어요!' : pct >= 40 ? '조금만 더!' : '복습이 필요해요';
  hide('game'); show('result');
  $('result').innerHTML = `
    <div class="result">
      <div class="big">${emoji}</div>
      <div class="score">${state.score}점</div>
      <div class="sub">${msg}</div>
      <div class="stars">${'⭐'.repeat(stars)}${'▫️'.repeat(3 - stars)}</div>
      <div class="rstats">
        <div class="rstat"><div class="v" style="color:var(--ok)">${state.correct}</div><div class="l">정답</div></div>
        <div class="rstat"><div class="v" style="color:var(--no)">${state.wrong}</div><div class="l">오답</div></div>
        <div class="rstat"><div class="v">${pct}%</div><div class="l">정답률</div></div>
        <div class="rstat"><div class="v" style="color:var(--gold)">+${xp}</div><div class="l">XP</div></div>
      </div>
      ${submitButtonHtml()}
      <div class="row" style="justify-content:center;margin-top:20px">
        <button class="btn sec" onclick="openUnit(state.unit)">단원으로</button>
        <button class="btn" onclick="retryMode()">다시 도전</button>
      </div>
    </div>`;
}

/* ---------- 결과 제출 (교사 링크로 배포 시에만 노출) ---------- */
function submitEnabled() {
  return !!(window.ResultCollector && ResultCollector.config && ResultCollector.config.endpoint);
}
function submitButtonHtml() {
  if (!submitEnabled()) return '';
  return `<div class="row" style="justify-content:center;margin-top:6px">
      <button class="btn" id="submitBtn" style="background:#16a34a"
        onclick="submitResult()">📤 선생님께 결과 제출</button></div>`;
}
function submitResult() {
  if (!submitEnabled()) return;
  const modeName = { quiz: '스피드퀴즈', ox: 'OX', cards: '개념카드', match: '매칭' }[state.mode] || '';
  const subj = DATA[state.subject].short;
  // 시트 탭을 '과목 · 단원'으로 분리 (교사가 단원별로 확인 가능)
  ResultCollector.config.tool = '컴활1급 ' + subj + ' · ' + state.unit.name;
  const r = state.lastResult || { total: state.correct + state.wrong, pct: 0 };
  ResultCollector.open({
    score: state.score,
    correct: state.correct,
    total: r.total,
    durationSec: Math.round((Date.now() - (state.startTime || Date.now())) / 1000),
    labels: { correct: '맞힘', total: '문항수', wrong: '모드' },
    wrong: modeName,
  });
}
function showSimpleDone(emoji, title, sub, xp) {
  hide('game'); show('result');
  $('result').innerHTML = `
    <div class="result">
      <div class="big">${emoji}</div>
      <div class="score" style="font-size:26px">${title}</div>
      <div class="sub">${sub}</div>
      <div class="sub" style="color:var(--gold);margin-top:10px;font-weight:700">+${xp} XP</div>
      <div class="row" style="justify-content:center;margin-top:20px">
        <button class="btn sec" onclick="openUnit(state.unit)">단원으로</button>
        <button class="btn" onclick="retryMode()">다시</button>
      </div>
    </div>`;
}
function retryMode() {
  const m = state.mode;
  if (m === 'cards') startCards();
  else if (m === 'quiz') startQuiz();
  else if (m === 'ox') startOX();
  else if (m === 'match') startMatch();
}

/* ---------- init ---------- */
updateHeader();
renderHome();
