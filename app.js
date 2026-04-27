import { db } from './firebase-config.js';
import {
  collection, doc, addDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── Auth ────────────────────────────────────────────────────────────────────
const PASSWORD       = 'Champions';
const ADMIN_PASSWORD = 'NickAdmin';

const loginScreen = document.getElementById('loginScreen');
const appShell    = document.getElementById('appShell');
const loginError  = document.getElementById('loginError');
const loginForm   = document.getElementById('loginForm');
const logoutBtn   = document.getElementById('logoutBtn');

const isAdmin = () => sessionStorage.getItem('pkl_admin') === '1';

function checkAuth() {
  if (sessionStorage.getItem('pkl_auth') === '1') showApp();
}

function showApp() {
  loginScreen.classList.add('fade-out');
  setTimeout(() => {
    loginScreen.hidden = true;
    appShell.hidden = false;
    window.scrollTo({ top: 0, behavior: 'instant' });

    // Show admin badge and Play tab only for admin
    document.getElementById('adminBadge').hidden = !isAdmin();
    document.getElementById('playTabBtn').hidden  = !isAdmin();

    // Hide add forms for non-admins
    document.getElementById('addPlayerForm').closest('.form-card').hidden = !isAdmin();
    document.getElementById('addSessionForm').closest('.form-card').hidden = !isAdmin();

    initListeners();
  }, 400);
}

loginForm.addEventListener('submit', e => {
  e.preventDefault();
  const pw = document.getElementById('passwordInput').value;
  if (pw === ADMIN_PASSWORD) {
    sessionStorage.setItem('pkl_auth', '1');
    sessionStorage.setItem('pkl_admin', '1');
    loginError.hidden = true;
    showApp();
  } else if (pw === PASSWORD) {
    sessionStorage.setItem('pkl_auth', '1');
    sessionStorage.removeItem('pkl_admin');
    loginError.hidden = true;
    showApp();
  } else {
    loginError.hidden = false;
    document.getElementById('passwordInput').value = '';
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('pkl_auth');
  sessionStorage.removeItem('pkl_admin');
  appShell.hidden = true;
  loginScreen.hidden = false;
  loginScreen.classList.remove('fade-out');
  unsubAll();
});

// ─── Tab navigation ──────────────────────────────────────────────────────────
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${target}`).classList.add('active');
  });
});

// ─── Firestore unsub registry ────────────────────────────────────────────────
const unsubs = [];
function unsubAll() { unsubs.forEach(fn => fn()); unsubs.length = 0; }

// ─── In-memory caches ────────────────────────────────────────────────────────
let players  = [];
let sessions = [];
let games    = [];

// ─── Flags ───────────────────────────────────────────────────────────────────
const FLAGS = {
  nz: '🇳🇿', uy: '🇺🇾', mx: '🇲🇽', ar: '🇦🇷',
  au: '🇦🇺', us: '🇺🇸', gb: '🇬🇧', br: '🇧🇷'
};
const COUNTRY_NAMES = {
  nz: 'New Zealand', uy: 'Uruguay', mx: 'Mexico', ar: 'Argentina',
  au: 'Australia',   us: 'USA',     gb: 'UK',     br: 'Brazil'
};

// ─── Init listeners ──────────────────────────────────────────────────────────
function initListeners() {
  unsubs.push(
    onSnapshot(query(collection(db, 'players'), orderBy('createdAt')), snap => {
      players = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderPlayers();
      renderPlaySelect();
      renderStats();
    }),
    onSnapshot(query(collection(db, 'sessions'), orderBy('date', 'desc')), snap => {
      sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSessions();
      renderSessionSelect();
    }),
    onSnapshot(query(collection(db, 'games'), orderBy('createdAt', 'desc')), snap => {
      games = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderRecentGames();
      renderStats();
    })
  );
}

// ─── PLAYERS TAB ─────────────────────────────────────────────────────────────
const playerList    = document.getElementById('playerList');
const addPlayerForm = document.getElementById('addPlayerForm');
const playerNameIn  = document.getElementById('playerName');
const playerCountry = document.getElementById('playerCountry');

addPlayerForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const name    = playerNameIn.value.trim();
  const country = playerCountry.value;
  if (!name || players.length >= 8) return;
  await addDoc(collection(db, 'players'), { name, country, createdAt: serverTimestamp() });
  addPlayerForm.reset();
  document.querySelectorAll('.flag-option').forEach(b => b.classList.remove('selected'));
  document.querySelector('.flag-option[data-code="nz"]').classList.add('selected');
  playerCountry.value = 'nz';
});

function renderPlayers() {
  renderHome();
  if (!players.length) {
    playerList.innerHTML = '<p class="empty-msg">No players yet.</p>';
    return;
  }
  playerList.innerHTML = players.map(p => `
    <div class="player-card">
      <span class="flag">${FLAGS[p.country] ?? '🏳️'}</span>
      <span class="player-name">${esc(p.name)}</span>
      <span class="country-label">${COUNTRY_NAMES[p.country] ?? p.country}</span>
      ${isAdmin() ? `<button class="icon-btn del-player" data-id="${p.id}" title="Remove player"><i class="bi bi-trash3"></i></button>` : ''}
    </div>
  `).join('');

  if (isAdmin()) {
    playerList.querySelectorAll('.del-player').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Remove this player?')) {
          await deleteDoc(doc(db, 'players', btn.dataset.id));
        }
      });
    });
  }
}

// ─── SESSIONS TAB ────────────────────────────────────────────────────────────
const sessionList    = document.getElementById('sessionList');
const addSessionForm = document.getElementById('addSessionForm');

addSessionForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!isAdmin()) return;
  const date    = document.getElementById('sessionDate').value;
  const time    = document.getElementById('sessionTime').value;
  const address = document.getElementById('sessionAddress').value.trim();
  const notes   = document.getElementById('sessionNotes').value.trim();
  if (!date) return;
  await addDoc(collection(db, 'sessions'), { date, time, address, notes, createdAt: serverTimestamp() });
  addSessionForm.reset();
  document.getElementById('sessionDate').value = today();
});

function mapsUrl(address) {
  return `https://maps.google.com/?q=${encodeURIComponent(address)}`;
}

function renderSessions() {
  renderHome();
  if (!sessions.length) {
    sessionList.innerHTML = '<p class="empty-msg">No sessions yet.</p>';
    return;
  }
  sessionList.innerHTML = sessions.map(s => `
    <div class="session-card">
      <div class="session-header">
        <span class="session-date"><i class="bi bi-calendar3"></i> ${formatDate(s.date)}</span>
        ${s.time ? `<span class="session-time"><i class="bi bi-clock"></i> ${s.time}</span>` : ''}
        ${isAdmin() ? `<button class="icon-btn del-session" data-id="${s.id}" title="Delete session"><i class="bi bi-trash3"></i></button>` : ''}
      </div>
      ${s.address ? `
        <p class="session-addr">
          <i class="bi bi-geo-alt"></i> ${esc(s.address)}
          <a href="${mapsUrl(s.address)}" target="_blank" class="maps-link"><i class="bi bi-map"></i> Maps</a>
        </p>` : ''}
      ${s.notes ? `<p class="session-notes">${esc(s.notes)}</p>` : ''}
    </div>
  `).join('');

  if (isAdmin()) {
    sessionList.querySelectorAll('.del-session').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this session?')) {
          await deleteDoc(doc(db, 'sessions', btn.dataset.id));
        }
      });
    });
  }
}

// ─── PLAY TAB ────────────────────────────────────────────────────────────────
const sessionSelect = document.getElementById('sessionSelect');
const playersGrid   = document.getElementById('playersGrid');
const score1In      = document.getElementById('score1');
const score2In      = document.getElementById('score2');
const recordGameBtn = document.getElementById('recordGameBtn');
const recentGames   = document.getElementById('recentGames');

let teamAssign = {};

function renderSessionSelect() {
  const prev = sessionSelect.value;
  sessionSelect.innerHTML = '<option value="">— Select session —</option>' +
    sessions.map(s => `<option value="${s.id}">${formatDate(s.date)}${s.address ? ' · ' + s.address : ''}</option>`).join('');
  if (prev) sessionSelect.value = prev;
}

function renderPlaySelect() {
  teamAssign = {};
  players.forEach(p => { teamAssign[p.id] = 0; });
  renderTeamGrid();
}

function renderTeamGrid() {
  if (!players.length) {
    playersGrid.innerHTML = '<p class="empty-msg">Add players first.</p>';
    recordGameBtn.disabled = true;
    return;
  }
  playersGrid.innerHTML = players.map(p => {
    const t = teamAssign[p.id] ?? 0;
    const cls   = t === 1 ? 'team1' : t === 2 ? 'team2' : '';
    const label = t === 1 ? 'Team 1' : t === 2 ? 'Team 2' : 'Tap to assign';
    return `
      <div class="player-tile ${cls}" data-id="${p.id}">
        <span class="tile-flag">${FLAGS[p.country] ?? '🏳️'}</span>
        <span class="tile-name">${esc(p.name)}</span>
        <span class="tile-team">${label}</span>
      </div>`;
  }).join('');

  playersGrid.querySelectorAll('.player-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      teamAssign[tile.dataset.id] = ((teamAssign[tile.dataset.id] ?? 0) + 1) % 3;
      renderTeamGrid();
    });
  });

  const t1 = Object.values(teamAssign).filter(v => v === 1).length;
  const t2 = Object.values(teamAssign).filter(v => v === 2).length;
  recordGameBtn.disabled = !(t1 === 2 && t2 === 2);
}

recordGameBtn.addEventListener('click', async () => {
  if (!isAdmin()) return;
  const sessionId = sessionSelect.value;
  const s1 = parseInt(score1In.value, 10);
  const s2 = parseInt(score2In.value, 10);
  if (!sessionId)                             { alert('Please select a session.'); return; }
  if (isNaN(s1) || isNaN(s2) || s1 < 0 || s2 < 0) { alert('Enter valid scores.'); return; }

  const team1 = Object.entries(teamAssign).filter(([,v]) => v === 1).map(([k]) => k);
  const team2 = Object.entries(teamAssign).filter(([,v]) => v === 2).map(([k]) => k);

  await addDoc(collection(db, 'games'), {
    sessionId, team1, team2, score1: s1, score2: s2, createdAt: serverTimestamp()
  });

  score1In.value = '';
  score2In.value = '';
  renderPlaySelect();
  alert('Game recorded!');
});

function renderRecentGames() {
  renderHome();
  const recent = games.slice(0, 15);
  if (!recent.length) {
    recentGames.innerHTML = '<p class="empty-msg">No games recorded yet.</p>';
    return;
  }
  recentGames.innerHTML = recent.map(g => {
    const t1names = (g.team1 || []).map(id => playerName(id)).join(' & ');
    const t2names = (g.team2 || []).map(id => playerName(id)).join(' & ');
    const winner  = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    return `
      <div class="game-card">
        <div class="game-teams">
          <span class="team-a ${winner === 'team1' ? 'winner' : ''}">${t1names}</span>
          <span class="score">${g.score1} – ${g.score2}</span>
          <span class="team-b ${winner === 'team2' ? 'winner' : ''}">${t2names}</span>
        </div>
        ${isAdmin() ? `<div class="game-actions"><button class="del-game-btn" data-id="${g.id}"><i class="bi bi-trash3"></i> Delete</button></div>` : ''}
      </div>`;
  }).join('');

  if (isAdmin()) {
    recentGames.querySelectorAll('.del-game-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Delete this game?')) {
          await deleteDoc(doc(db, 'games', btn.dataset.id));
        }
      });
    });
  }
}

// ─── STATS TAB ───────────────────────────────────────────────────────────────
const statsContainer = document.getElementById('statsContainer');

function renderStats() {
  if (!players.length) {
    statsContainer.innerHTML = '<p class="empty-msg">No data yet.</p>';
    return;
  }

  const stats = {};
  players.forEach(p => {
    stats[p.id] = { name: p.name, country: p.country, played: 0, wins: 0, losses: 0, draws: 0, pf: 0, pa: 0 };
  });

  games.forEach(g => {
    [...(g.team1 || []), ...(g.team2 || [])].forEach(id => { if (stats[id]) stats[id].played++; });
    const winner = g.score1 > g.score2 ? 'team1' : g.score2 > g.score1 ? 'team2' : 'draw';
    (g.team1 || []).forEach(id => {
      if (!stats[id]) return;
      stats[id].pf += g.score1; stats[id].pa += g.score2;
      if (winner === 'team1') stats[id].wins++;
      else if (winner === 'team2') stats[id].losses++;
      else stats[id].draws++;
    });
    (g.team2 || []).forEach(id => {
      if (!stats[id]) return;
      stats[id].pf += g.score2; stats[id].pa += g.score1;
      if (winner === 'team2') stats[id].wins++;
      else if (winner === 'team1') stats[id].losses++;
      else stats[id].draws++;
    });
  });

  const sorted = Object.values(stats).sort((a, b) => {
    const wr = s => s.played ? s.wins / s.played : 0;
    return wr(b) - wr(a) || b.wins - a.wins;
  });

  statsContainer.innerHTML = `
    <table class="stats-table">
      <thead><tr>
        <th>#</th><th>Player</th><th>P</th><th>W</th><th>L</th><th>D</th><th>W%</th><th>+/-</th>
      </tr></thead>
      <tbody>
        ${sorted.map((s, i) => {
          const wr   = s.played ? Math.round(s.wins / s.played * 100) : 0;
          const diff = s.pf - s.pa;
          return `<tr class="${i === 0 && s.played > 0 ? 'top-row' : ''}">
            <td>${i === 0 && s.played > 0 ? '🏆' : i + 1}</td>
            <td><span class="flag">${FLAGS[s.country] ?? '🏳️'}</span> ${esc(s.name)}</td>
            <td>${s.played}</td>
            <td>${s.wins}</td>
            <td>${s.losses}</td>
            <td>${s.draws}</td>
            <td>${wr}%</td>
            <td class="${diff >= 0 ? 'pos' : 'neg'}">${diff >= 0 ? '+' : ''}${diff}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ─── HOME TAB ────────────────────────────────────────────────────────────────
function renderHome() {
  const nextSessions = sessions.filter(s => s.date >= today()).sort((a, b) => a.date.localeCompare(b.date));
  const next   = nextSessions[0];
  const nextEl = document.getElementById('nextSession');
  if (next) {
    nextEl.innerHTML = `
      <div class="next-session-card">
        <i class="bi bi-calendar-event"></i>
        <div>
          <strong>${formatDate(next.date)}</strong>
          ${next.time    ? `<br><i class="bi bi-clock"></i> ${next.time}` : ''}
          ${next.address ? `<br><i class="bi bi-geo-alt"></i> ${esc(next.address)}
            <a href="${mapsUrl(next.address)}" target="_blank" class="maps-link"><i class="bi bi-map"></i> Maps</a>` : ''}
        </div>
      </div>`;
  } else {
    nextEl.innerHTML = '<p class="empty-msg">No upcoming sessions.</p>';
  }
  document.getElementById('homeStatGames').textContent    = games.length;
  document.getElementById('homeStatPlayers').textContent  = players.length;
  document.getElementById('homeStatSessions').textContent = sessions.length;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function esc(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function playerName(id) {
  const p = players.find(pl => pl.id === id);
  return p ? p.name : 'Unknown';
}

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.getElementById('sessionDate').value = today();
checkAuth();
