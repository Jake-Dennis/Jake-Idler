import { Router } from "express";
import { heroService, type HeroResponse } from "../services/hero-service.js";

const router = Router();

// ─── Theme Colors ────────────────────────────────────────────
// Dark bg:   #0a0a14
// Card bg:   #12122a
// Card bd:   #1a1a3e
// Gold:      #fbbf24
// Purple:    #7c3aed
// Green:     #22c55e
// Red:       #ef4444
// Font:      system-ui

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>JAKE IDLER</title>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/lucide@latest"></script>
  <link rel="stylesheet" href="/static/css/login.css" />
</head>
<body>

  <!-- ═══════════ LOGIN SCREEN ═══════════ -->
  <div id="loginScreen" class="screen active">
    <div class="card card-centered">
      <h1><span class="gold">JAKE</span> <span class="purple">IDLER</span></h1>
      <p class="subtitle">An idle RPG adventure</p>

      <div id="loginAlert" class="alert alert-error"></div>

      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" placeholder="Enter username" autocomplete="username" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Enter password" autocomplete="current-password" />
      </div>

      <div class="btn-group">
        <button id="loginBtn" class="btn btn-primary">Login</button>
        <button id="registerBtn" class="btn btn-gold">Register</button>
      </div>
    </div>
  </div>

  <!-- ═══════════ HERO SELECT SCREEN ═══════════ -->
  <div id="heroScreen" class="screen">
    <div class="card">
      <div class="hero-list-header">
        <h2>Select Hero</h2>
        <div style="display:flex;gap:8px;align-items:center;">
          <button id="refreshHeroesBtn" class="btn btn-ghost btn-sm">⟳ Refresh</button>
          <button id="logoutBtn" class="btn btn-ghost btn-sm">Logout</button>
        </div>
      </div>

      <div id="heroList" class="hero-layout">
        <!-- Left: hero list -->
        <div id="heroListContainer">
          <div id="heroesLoading" class="loading"></div>
          <div id="heroesEmpty" class="empty-heroes" style="display:none;">
            <p>No heroes yet. Create one to begin your adventure!</p>
          </div>
          <div id="heroesList"></div>
        </div>

        <!-- Right: create hero form -->
        <div class="create-hero-card">
          <h3>Create Hero</h3>
          <div id="createAlert" class="alert alert-error"></div>
          <div class="form-group">
            <label for="heroName">Hero Name</label>
            <input type="text" id="heroName" placeholder="Enter hero name" maxlength="20" />
          </div>
          <button id="createHeroBtn" class="btn btn-gold">Create Hero</button>
        </div>
      </div>
    </div>
  </div>

  <script>
    (function() {
      'use strict';

      // ── DOM refs ────────────────────────────────────────
      const loginScreen  = document.getElementById('loginScreen');
      const heroScreen   = document.getElementById('heroScreen');
      const loginAlert   = document.getElementById('loginAlert');
      const createAlert  = document.getElementById('createAlert');
      const usernameEl   = document.getElementById('username');
      const passwordEl   = document.getElementById('password');
      const heroNameEl   = document.getElementById('heroName');
      const loginBtn     = document.getElementById('loginBtn');
      const registerBtn  = document.getElementById('registerBtn');
      const createHeroBtn= document.getElementById('createHeroBtn');
      const refreshBtn   = document.getElementById('refreshHeroesBtn');
      const logoutBtn    = document.getElementById('logoutBtn');
      const heroesList   = document.getElementById('heroesList');
      const heroesLoading= document.getElementById('heroesLoading');
      const heroesEmpty  = document.getElementById('heroesEmpty');

      // ── State ───────────────────────────────────────────
      let token = localStorage.getItem('token');

      // ── Helpers ─────────────────────────────────────────
      function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
      }

      function showAlert(el, message, type) {
        el.textContent = message;
        el.className = 'alert alert-' + type + ' show';
      }

      function clearAlerts() {
        loginAlert.className = 'alert alert-error';
        loginAlert.textContent = '';
        createAlert.className = 'alert alert-error';
        createAlert.textContent = '';
      }

      async function api(path, options = {}) {
        const headers = { 'Content-Type': 'application/json', ...options.headers };
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(path, { ...options, headers });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg = data?.error
            ? (typeof data.error === 'string' ? data.error : JSON.stringify(data.error))
            : 'Request failed (' + res.status + ')';
          throw new Error(msg);
        }
        return data;
      }

      // ── Auth ────────────────────────────────────────────
      async function handleLogin() {
        const username = usernameEl.value.trim();
        const password = passwordEl.value;
        if (!username || !password) {
          showAlert(loginAlert, 'Please enter username and password.', 'error');
          return;
        }
        try {
          loginBtn.disabled = true;
          loginBtn.textContent = 'Logging in...';
          const data = await api('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          token = data.token;
          localStorage.setItem('token', token);
          clearAlerts();
          await loadHeroes();
          showScreen(heroScreen);
        } catch (err) {
          showAlert(loginAlert, err.message, 'error');
        } finally {
          loginBtn.disabled = false;
          loginBtn.textContent = 'Login';
        }
      }

      async function handleRegister() {
        const username = usernameEl.value.trim();
        const password = passwordEl.value;
        if (!username || !password) {
          showAlert(loginAlert, 'Please enter username and password.', 'error');
          return;
        }
        try {
          registerBtn.disabled = true;
          registerBtn.textContent = 'Registering...';
          const data = await api('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
          });
          token = data.token;
          localStorage.setItem('token', token);
          clearAlerts();
          await loadHeroes();
          showScreen(heroScreen);
        } catch (err) {
          showAlert(loginAlert, err.message, 'error');
        } finally {
          registerBtn.disabled = false;
          registerBtn.textContent = 'Register';
        }
      }

      // ── Heroes ──────────────────────────────────────────
      async function loadHeroes() {
        heroesLoading.style.display = 'block';
        heroesEmpty.style.display = 'none';
        heroesList.innerHTML = '';

        try {
          const data = await api('/api/heroes');
          const heroes = data.heroes || [];

          if (heroes.length === 0) {
            heroesLoading.style.display = 'none';
            heroesEmpty.style.display = 'block';
            return;
          }

          heroesList.innerHTML = heroes.map(h => {
            const st = h.stats || {};
            return '<div class="hero-row">' +
              '<div class="hero-info">' +
                '<div class="hero-name">' + escHtml(h.name) + '</div>' +
                '<div class="hero-meta">' +
                  '<span>Lv.' + (h.level ?? 0) + '</span>' +
                  '<span class="stat-hp"><i data-lucide="heart" style="width:12px;height:12px"></i> ' + (st.hp ?? 0) + '</span>' +
                  '<span class="stat-atk"><i data-lucide="sword" style="width:12px;height:12px"></i> ' + (st.atk ?? 0) + '</span>' +
                  '<span class="stat-def"><i data-lucide="shield" style="width:12px;height:12px"></i> ' + (st.def ?? 0) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="hero-actions">' +
                '<a href="/game/' + h.id + '" class="btn btn-primary btn-sm">Play</a>' +
                '<button class="btn btn-danger btn-sm" data-hero-id="' + h.id + '" data-hero-name="' + escAttr(h.name) + '">Delete</button>' +
              '</div>' +
            '</div>';
          }).join('');
          if (typeof lucide !== 'undefined') lucide.createIcons();

          // Attach delete handlers
          heroesList.querySelectorAll('[data-hero-id]').forEach(btn => {
            btn.addEventListener('click', () => deleteHero(btn.dataset.heroId, btn.dataset.heroName));
          });
        } catch (err) {
          showAlert(createAlert, 'Failed to load heroes: ' + err.message, 'error');
        } finally {
          heroesLoading.style.display = 'none';
        }
      }

      async function createHero() {
        const name = heroNameEl.value.trim();
        if (!name || name.length < 2) {
          showAlert(createAlert, 'Hero name must be at least 2 characters.', 'error');
          return;
        }
        try {
          createHeroBtn.disabled = true;
          createHeroBtn.textContent = 'Creating...';
          await api('/api/heroes', {
            method: 'POST',
            body: JSON.stringify({ name }),
          });
          heroNameEl.value = '';
          createAlert.className = 'alert alert-error';
          createAlert.textContent = '';
          await loadHeroes();
        } catch (err) {
          showAlert(createAlert, err.message, 'error');
        } finally {
          createHeroBtn.disabled = false;
          createHeroBtn.textContent = 'Create Hero';
        }
      }

      async function deleteHero(heroId, heroName) {
        if (!confirm('Delete "' + heroName + '"? This cannot be undone.')) return;
        try {
          await api('/api/heroes/' + heroId, { method: 'DELETE' });
          await loadHeroes();
        } catch (err) {
          showAlert(createAlert, 'Failed to delete hero: ' + err.message, 'error');
        }
      }

      // ── Utilities ───────────────────────────────────────
      function escHtml(s) {
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
      }
      function escAttr(s) {
        return s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
      }

      // ── Events ──────────────────────────────────────────
      loginBtn.addEventListener('click', handleLogin);
      registerBtn.addEventListener('click', handleRegister);
      createHeroBtn.addEventListener('click', createHero);
      refreshBtn.addEventListener('click', loadHeroes);

      logoutBtn.addEventListener('click', () => {
        token = null;
        localStorage.removeItem('token');
        usernameEl.value = '';
        passwordEl.value = '';
        showScreen(loginScreen);
      });

      // Enter key support
      passwordEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleLogin(); });
      usernameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') passwordEl.focus(); });
      heroNameEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') createHero(); });

      // ── Bootstrap ───────────────────────────────────────
      (async function init() {
        if (token) {
          try {
            await loadHeroes();
            showScreen(heroScreen);
            return;
          } catch (_) {
            // Token expired or invalid — show login
            token = null;
            localStorage.removeItem('token');
          }
        }
        showScreen(loginScreen);
      })();

    })();
  </script>

</body>
</html>`;

// GET /game — serve the web-based game client
router.get("/", (_req, res) => {
  res.type("html").send(HTML);
});

// ─── Game Page HTML Generator ───────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateGameHtml(hero: HeroResponse): string {
  const heroJson = JSON.stringify(hero);
  const safeName = escHtml(hero.name);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeName} - JAKE IDLER</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&display=swap" rel="stylesheet">
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="/static/css/game.css" />
</head>
<body>

<script id="hero-data" type="application/json">${heroJson}</script>

<!-- ═══════════ HERO BAR ═══════════ -->
<div class="hero-bar" id="hero-bar">
  <div class="hero-avatar" id="hero-avatar-wrap" title="Change photo">
    <img id="hero-avatar-img" src="${hero.photoUrl || ''}" alt="${safeName}" style="${hero.photoUrl ? '' : 'display:none'}">
    <div class="hero-avatar-placeholder" id="hero-avatar-placeholder" style="${hero.photoUrl ? 'display:none' : ''}">${safeName.charAt(0).toUpperCase()}</div>
    <div class="hero-avatar-overlay"><i data-lucide="camera" style="width:14px;height:14px"></i></div>
  </div>
  <input type="file" id="hero-photo-input" accept="image/*" style="display:none">
  <span class="h-name" id="hero-bar-name">${safeName}</span>
  <span class="h-stat">Lv.<span class="h-val" id="hero-bar-level">${hero.level}</span></span>
  <span class="h-stat"><i data-lucide="sword" style="width:14px;height:14px"></i> <span class="h-val" id="hero-bar-atk">${hero.stats.atk}</span></span>
  <span class="h-stat"><i data-lucide="shield" style="width:14px;height:14px"></i> <span class="h-val" id="hero-bar-def">${hero.stats.def}</span></span>
  <span class="h-stat">
    <i data-lucide="heart" style="width:14px;height:14px"></i> <span class="hp-bar-outer"><span class="hp-bar-inner hp-green" id="hero-bar-hp-fill" style="width:100%"></span></span>
    <span id="hero-bar-hp">${hero.stats.hp}</span>/<span id="hero-bar-maxhp">${hero.stats.hp}</span>
  </span>
  <span class="h-stat"><i data-lucide="coins" style="width:14px;height:14px"></i> <span class="h-val" id="hero-bar-gold">${hero.gold}</span></span>
</div>

<!-- ═══════════ TABS ═══════════ -->
<div class="tab-bar">
  <button class="tab active" data-tab="dungeon"><i data-lucide="sword" style="width:16px;height:16px"></i> Dungeon</button>
  <button class="tab" data-tab="equipment"><i data-lucide="shield" style="width:16px;height:16px"></i> Equipment</button>
  <button class="tab" data-tab="party"><i data-lucide="users" style="width:16px;height:16px"></i> Party</button>
</div>

<!-- ═══════════ TAB: DUNGEON ═══════════ -->
<div id="tab-dungeon" class="tab-content active">

  <div id="dungeon-setup" class="dungeon-setup">
    <div class="floor-selector">
      <label for="floor-select" style="color:#4a454a;font-weight:700;font-size:.75rem;letter-spacing:2px;margin-right:8px">FLOOR</label>
      <select id="floor-select"></select>
    </div>

    <div id="monster-preview" class="monster-preview">
      Select a floor and enter the dungeon to begin your adventure!
    </div>

    <div class="btn-group" style="justify-content:center;max-width:400px;margin:0 auto">
      <button id="enter-btn" class="btn btn-primary"><i data-lucide="sword" style="width:16px;height:16px"></i> Enter Dungeon</button>
      <button id="loop-btn" class="btn btn-loop"><i data-lucide="refresh-cw" style="width:16px;height:16px"></i> LOOP</button>
    </div>
  </div>

  <div id="combat-arena">
    <div class="round-counter" id="round-counter">Round 0</div>

    <div class="arena">
      <div class="arena-row" id="boss-row"></div>
      <div class="arena-row" id="monster-row"></div>
      <div id="arena-divider" style="border-top:1px solid #1a1518;margin:6px 0"></div>
      <div class="hero-row" id="hero-row"></div>
    </div>

    <div class="combat-log" id="combat-log"></div>

    <div id="loop-info" class="loop-info"></div>
  </div>
</div>

<!-- ═══════════ TAB: EQUIPMENT ═══════════ -->
<div id="tab-equipment" class="tab-content">
  <div class="equip-section-title">Equipment Slots</div>
  <div class="equip-grid" id="equip-grid"></div>

  <div class="equip-section-title">Inventory <span class="inv-count" id="inv-count"></span></div>
  <div id="equip-inventory"></div>
</div>

<!-- ═══════════ TAB: PARTY ═══════════ -->
<div id="tab-party" class="tab-content">

  <!-- Not in party -->
  <div id="party-not-in" style="display:none">
    <div class="card" style="padding:24px">
      <div class="party-section">
        <h2>Create Party</h2>
        <div class="party-controls">
          <input id="party-name-input" class="party-input" placeholder="Party name" style="flex:1;min-width:160px" />
          <button onclick="createParty()" class="btn btn-primary btn-sm">Create</button>
        </div>
      </div>
      <div class="party-section">
        <h2>Join Party</h2>
        <div class="party-controls">
          <input id="party-join-input" class="party-input" placeholder="Party ID" style="flex:1;min-width:160px" />
          <button onclick="joinParty()" class="btn btn-primary btn-sm">Join</button>
        </div>
      </div>
    </div>
  </div>

  <!-- In party -->
  <div id="party-in" style="display:none">
    <div class="card" style="padding:24px">
      <div class="party-title" id="party-title">Party Name</div>
      <div class="party-info" id="party-info">Members: 1/999 · Floor 1</div>

      <div id="party-members"></div>

      <div class="party-section" style="margin-top:16px">
        <h3>Controls</h3>
        <div class="party-controls">
          <input id="invite-input" class="party-input" placeholder="Username to invite" style="flex:1;min-width:140px" />
          <button onclick="invitePlayer()" class="btn btn-primary btn-sm">Invite</button>
        </div>
        <div class="party-controls">
          <select id="bot-role-select" class="party-input">
            <option value="tank">Tank</option>
            <option value="dps">DPS</option>
            <option value="healer">Healer</option>
          </select>
          <button onclick="addBot()" class="btn btn-ghost btn-sm">Add Bot</button>
          <button onclick="leaveParty()" class="btn btn-danger btn-sm" style="margin-left:auto">Leave Party</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Pending invites -->
  <div id="party-invites" style="display:none;margin-top:16px">
    <div class="card" style="padding:20px">
      <h3 style="font-size:.95rem;font-weight:600;margin-bottom:10px;color:#a0a0c0">Pending Invites</h3>
      <div id="invites-list"></div>
    </div>
  </div>

</div>
</div>

<!-- ═══════════ RESULT OVERLAY ═══════════ -->
<div id="result-overlay" class="overlay">
  <div class="overlay-card">
    <h2 id="result-title">Victory!</h2>
    <div id="result-icon" style="font-size:3rem;margin:8px 0"></div>
    <p id="result-details"></p>
    <div id="result-loop-summary" style="display:none;margin:12px 0;padding:12px;background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.3);border-radius:8px">
      <div style="font-size:.85rem;color:#fbbf24"><i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Loop Run #<span id="loop-run-count">0</span></div>
      <div class="big-num" id="loop-total-gold">0</div>
      <div style="font-size:.8rem;color:#a0a0c0">total gold earned</div>
    </div>
    <div class="btn-group" style="margin-top:16px;justify-content:center">
      <button id="result-btn" class="btn btn-primary">OK</button>
      <button id="result-retry-btn" class="btn btn-ghost" style="display:none"><i data-lucide="sword" style="width:16px;height:16px"></i> Retry</button>
    </div>
  </div>
</div>

<script>
'use strict';

var hero = JSON.parse(document.getElementById('hero-data').textContent);
var token = localStorage.getItem('token');
if (!token) { window.location.href = '/game'; throw new Error('No token'); }

var combatInterval = null;
var isLooping = false;
var loopCount = 0;
var totalGoldEarned = 0;
var prevState = null;
var currentParty = null;

// ─── Weapon Type ───────────────────────────────────────────
function getWeaponType() {
  var w = hero.equipped.rightHandWeapon || hero.equipped.leftHand;
  return (w && w.type) || 'melee';
}

// ─── HP Color ──────────────────────────────────────────────
function hpColorClass(hp, max) {
  var pct = max > 0 ? (hp / max) * 100 : 0;
  return pct > 50 ? 'hp-green' : pct > 25 ? 'hp-yellow' : 'hp-red';
}

// ─── Tab Switching ─────────────────────────────────────────
document.querySelectorAll('.tab').forEach(function(tab) {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    document.querySelectorAll('.tab-content').forEach(function(t) { t.classList.remove('active'); });
    this.classList.add('active');
    document.getElementById('tab-' + this.dataset.tab).classList.add('active');
    if (this.dataset.tab === 'equipment') loadEquipment();
    if (this.dataset.tab === 'party') loadParty();
  });
});

// ─── Floor Selector ────────────────────────────────────────
(function initFloorSelector() {
  var sel = document.getElementById('floor-select');
  for (var i = 1; i <= hero.currentFloor; i++) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = 'Floor ' + i + (i % 10 === 0 ? ' [BOSS]' : '') + (i === hero.currentFloor ? ' (current)' : '');
    sel.appendChild(opt);
  }
  sel.addEventListener('change', function() {
    var floor = parseInt(this.value);
    var preview = document.getElementById('monster-preview');
    var isBoss = floor % 10 === 0;
    preview.innerHTML = '<strong>Floor ' + floor + '</strong><br />' +
      (isBoss ? '<span style="color:#fbbf24;font-weight:600"><i data-lucide="crown" style="width:16px;height:16px"></i> BRACKET BOSS FLOOR</span>' : 'Difficulty scales with floor level.') +
      '<br /><span style="color:#8888aa;font-size:.8rem">' + (isBoss ? 'A powerful boss awaits!' : 'Defeat all monsters to face the floor boss.') + '</span>';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
  // Trigger initial preview
  sel.dispatchEvent(new Event('change'));
})();

// ─── Hero Bar ──────────────────────────────────────────────
function updateHeroBar(h) {
  if (!h) return;
  document.getElementById('hero-bar-name').textContent = h.name || hero.name;
  document.getElementById('hero-bar-level').textContent = h.level || hero.level;
  document.getElementById('hero-bar-atk').textContent = h.stats ? h.stats.atk : hero.stats.atk;
  document.getElementById('hero-bar-def').textContent = h.stats ? h.stats.def : hero.stats.def;
  document.getElementById('hero-bar-gold').textContent = h.gold != null ? h.gold : hero.gold;
  var hp = h.stats ? h.stats.hp : hero.stats.hp;
  var maxHp = h.stats ? h.stats.hp : hero.stats.hp;
  document.getElementById('hero-bar-hp').textContent = hp;
  document.getElementById('hero-bar-maxhp').textContent = maxHp;
  var bar = document.getElementById('hero-bar-hp-fill');
  bar.style.width = '100%';
  bar.className = 'hp-bar-inner ' + hpColorClass(hp, maxHp);
}

// ─── Combat Log ────────────────────────────────────────────
function addLog(type, msg) {
  var log = document.getElementById('combat-log');
  var entry = document.createElement('div');
  entry.className = 'log-entry ' + type;
  entry.textContent = msg;
  log.appendChild(entry);
  log.scrollTop = log.scrollHeight;
}

// ─── Floating Text ─────────────────────────────────────────
function floatText(x, y, text, cls) {
  var el = document.createElement('div');
  el.className = 'float-text ' + (cls || '');
  el.textContent = (typeof text === 'number') ? Math.round(text) : text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(function() { el.remove(); }, 800);
}

// ─── Render Monsters ───────────────────────────────────────
function renderMonsters(monsters) {
  var bossRow = document.getElementById('boss-row');
  var monsterRow = document.getElementById('monster-row');
  bossRow.innerHTML = '';
  monsterRow.innerHTML = '';

  monsters.forEach(function(m) {
    var card = document.createElement('div');
    card.className = 'monster-card' + (m.isBoss ? ' boss' : '') + (m.isCurrentFocus ? ' is-focus' : '');
    card.id = 'monster-' + m.id;
    var pct = m.maxHp > 0 ? (m.hp / m.maxHp) * 100 : 0;
    var icon = m.isBoss ? '<i data-lucide="skull" style="width:28px;height:28px"></i>' : '<i data-lucide="bug" style="width:22px;height:22px"></i>';
    card.innerHTML = '<div class="monster-icon">' + icon + '</div>' +
      '<div class="monster-name">' + escHtml(m.name) + '</div>' +
      '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner ' + hpColorClass(m.hp, m.maxHp) + '" style="width:' + pct + '%"></div></div>' +
      '<div class="monster-hp">' + Math.round(m.hp) + '/' + Math.round(m.maxHp) + '</div>';
    if (m.isBoss) bossRow.appendChild(card);
    else monsterRow.appendChild(card);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Render Party Heroes ───────────────────────────────────
function renderPartyHeroes(partyHeroes) {
  var row = document.getElementById('hero-row');
  row.innerHTML = '';
  var icons = { tank: 'shield', dps: 'sword', healer: 'heart' };
  var roleOrder = ['tank', 'dps', 'healer'];

  roleOrder.forEach(function(role) {
    var heroes = partyHeroes.filter(function(h) { return h.role === role; });
    if (heroes.length === 0) return;

    // Horizontal row for this role's heroes
    var heroRow = document.createElement('div');
    heroRow.className = 'role-heroes-row';

    heroes.forEach(function(h) {
      var card = document.createElement('div');
      card.className = 'hero-card role-' + role;
      card.id = 'hero-' + h.heroId;
      var pct = h.maxHp > 0 ? (h.hp / h.maxHp) * 100 : 0;
      var heroName = (h.heroId === hero.id) ? hero.name : (h.heroId.startsWith('bot_') ? h.heroId.substring(4, 12) + ' (Bot)' : h.heroId.substring(0, 10));
      var photoUrl = (h.heroId === hero.id) ? hero.photoUrl : null;
      var iconHtml;
      if (photoUrl) {
        iconHtml = '<img class="hero-card-photo" src="' + photoUrl + '" alt="">';
      } else {
        iconHtml = '<div class="hero-role-icon"><i data-lucide="' + (icons[role] || 'sword') + '" style="width:18px;height:18px"></i></div>';
      }
      card.innerHTML = iconHtml +
        '<div class="hero-card-name">' + heroName + '</div>' +
        '<div class="hp-bar-outer"><div class="hp-bar-inner ' + hpColorClass(h.hp, h.maxHp) + '" style="width:' + pct + '%"></div></div>' +
        '<div class="hero-hp">' + Math.round(h.hp) + '/' + Math.round(h.maxHp) + '</div>';
      var img = card.querySelector('.hero-card-photo');
      if (img) img.onerror = function() { this.style.display = 'none'; };
      heroRow.appendChild(card);
    });
    row.appendChild(heroRow);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Update HP Bars ────────────────────────────────────────
function updateMonsterBars(monsters) {
  monsters.forEach(function(m) {
    var el = document.getElementById('monster-' + m.id);
    if (!el) return;
    var pct = m.maxHp > 0 ? (m.hp / m.maxHp) * 100 : 0;
    var bar = el.querySelector('.hp-bar-inner');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'hp-bar-inner ' + hpColorClass(m.hp, m.maxHp);
    }
    var hpText = el.querySelector('.monster-hp');
    if (hpText) hpText.textContent = m.hp + '/' + m.maxHp;
  });
}

function updateHeroBars(partyHeroes) {
  partyHeroes.forEach(function(h) {
    var el = document.getElementById('hero-' + h.heroId);
    if (!el) return;
    var pct = h.maxHp > 0 ? (h.hp / h.maxHp) * 100 : 0;
    var bar = el.querySelector('.hp-bar-inner');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'hp-bar-inner ' + hpColorClass(h.hp, h.maxHp);
    }
    var hpText = el.querySelector('.hero-hp');
    if (hpText) hpText.textContent = h.hp + '/' + h.maxHp;
  });
}

// ─── Animation Pipeline (inlined from animation/*.ts) ──────

// Effect → FSM state mapping
var EFFECT_TO_FSM_STATE = {
  ATTACK: 'ATTACKING',
  HIT: 'IMPACT',
  HEAL: 'RECOVERY',
  BLOCK: 'RECOVERY',
  DEATH: 'DEAD',
  MONSTER_DEATH: 'DEAD',
  MONSTER_APPEAR: 'IDLE'
};

// Effect → CSS class(es) mapping
var EFFECT_TO_CSS_CLASS = {
  ATTACK: ['animate-lunge', 'animate-windup'],
  HIT: ['animate-flash-red', 'animate-shake'],
  HEAL: ['animate-pulse-green'],
  BLOCK: ['animate-shield'],
  DEATH: ['animate-fade-out'],
  MONSTER_DEATH: ['animate-fade-out'],
  MONSTER_APPEAR: ['animate-fade-in']
};

// ─── CombatDiff ────────────────────────────────────────────
function computeAnimationSteps(prev, next) {
  if (prev === null) return [];
  if (next.round == null) return [];
  if (next.round <= (prev.round != null ? prev.round : -1)) return [];

  var steps = [];
  var stepIndex = 0;

  if (next.partyHeroes && prev.partyHeroes) {
    for (var hi = 0; hi < next.partyHeroes.length; hi++) {
      var h = next.partyHeroes[hi];
      var prevH = null;
      for (var pi = 0; pi < prev.partyHeroes.length; pi++) {
        if (prev.partyHeroes[pi].heroId === h.heroId) { prevH = prev.partyHeroes[pi]; break; }
      }
      if (!prevH) continue;

      // Hero dealt damage
      if (h.damage > 0) {
        var wType = (h.heroId === hero.id) ? getWeaponType() : 'melee';
        steps.push({ type: 'ATTACK', entityId: 'hero-' + h.heroId, weaponType: wType, damage: Math.round(h.damage), isCrit: h.crit, stepIndex: stepIndex++ });

        // Monster impact (monster-global)
        steps.push({ type: 'HIT', entityId: null, damage: Math.round(h.damage), isCrit: h.crit, stepIndex: stepIndex++ });
      }

      // Hero received healing
      if (h.healingReceived > 0) {
        steps.push({ type: 'HEAL', entityId: 'hero-' + h.heroId, healAmount: Math.round(h.healingReceived), stepIndex: stepIndex++ });
      }

      // Hero took damage
      if (h.damageTaken > 0) {
        var dmgTaken = Math.round(h.damageTaken);
        steps.push({ type: 'HIT', entityId: 'hero-' + h.heroId, damage: dmgTaken, isCrit: h.monsterCrit, stepIndex: stepIndex++ });

        if (h.role === 'tank') {
          steps.push({ type: 'BLOCK', entityId: 'hero-' + h.heroId, damage: dmgTaken, stepIndex: stepIndex++ });
        }
      }

      // Hero died
      if (!h.alive && prevH.alive) {
        steps.push({ type: 'DEATH', entityId: 'hero-' + h.heroId, stepIndex: stepIndex++ });
      }
    }
  }

  // Monster was killed this round
  if (next.monsterJustKilled && !prev.monsterJustKilled) {
    steps.push({ type: 'MONSTER_DEATH', entityId: null, stepIndex: stepIndex++ });
  }

  // New monster appeared
  if (next.currentMonsterName && next.currentMonsterName !== prev.currentMonsterName && !next.monsterJustKilled) {
    steps.push({ type: 'MONSTER_APPEAR', entityId: null, stepIndex: stepIndex++ });
  }

  return steps;
}

// ─── EntityAnimFSM ─────────────────────────────────────────
function EntityAnimFSM() {
  this.states = {};
}

var LEGAL_TRANSITIONS = {
  'IDLE→ATTACKING': true,
  'ATTACKING→IMPACT': true,
  'ATTACKING→DEAD': true,
  'IMPACT→RECOVERY': true,
  'IMPACT→DEAD': true,
  'RECOVERY→IDLE': true,
  'RECOVERY→DEAD': true,
  'DEAD→IDLE': true
};

EntityAnimFSM.prototype.registerEntity = function(entityId) {
  if (!this.states.hasOwnProperty(entityId)) {
    this.states[entityId] = 'IDLE';
  }
};

EntityAnimFSM.prototype.getState = function(entityId) {
  return this.states[entityId] || 'IDLE';
};

EntityAnimFSM.prototype.canTransition = function(entityId, targetState) {
  var current = this.getState(entityId);
  // Any → DEAD always allowed
  if (targetState === 'DEAD') return true;
  // DEAD entity: only DEAD→IDLE allowed
  if (current === 'DEAD') return targetState === 'IDLE';
  return LEGAL_TRANSITIONS[current + '→' + targetState] === true;
};

EntityAnimFSM.prototype.transitionTo = function(entityId, targetState) {
  if (!this.canTransition(entityId, targetState)) return false;
  this.states[entityId] = targetState;
  return true;
};

EntityAnimFSM.prototype.isDead = function(entityId) {
  return this.getState(entityId) === 'DEAD';
};

EntityAnimFSM.prototype.forceReset = function(entityId) {
  this.states[entityId] = 'IDLE';
};

// ─── AnimationQueue ────────────────────────────────────────
var DURATION_CACHE = {};
var DEFAULT_DURATION_MS = 300;
var TIMEOUT_GUARD_MS = 500;
var MAX_STEPS = 100;

function resolveAnimDuration(className) {
  if (DURATION_CACHE[className] !== undefined) return DURATION_CACHE[className];

  var el = document.createElement('div');
  el.className = className;
  el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px';
  document.body.appendChild(el);

  var ms = DEFAULT_DURATION_MS;
  try {
    var raw = getComputedStyle(el).animationDuration;
    if (raw) {
      if (raw.indexOf('ms') !== -1) { var v = parseFloat(raw); if (!isNaN(v)) ms = v; }
      else if (raw.indexOf('s') !== -1) { var v = parseFloat(raw); if (!isNaN(v)) ms = v * 1000; }
    }
  } catch(e) {}
  document.body.removeChild(el);

  DURATION_CACHE[className] = ms;
  return ms;
}

function AnimationQueue(fsm, getAnimDurationFn) {
  this.fsm = fsm;
  this.getAnimDuration = getAnimDurationFn || resolveAnimDuration;
}

AnimationQueue.prototype.playSteps = async function(steps) {
  if (!steps || steps.length === 0) return;

  if (steps.length > MAX_STEPS) {
    console.warn('[AnimationQueue] Step count (' + steps.length + ') exceeds max (' + MAX_STEPS + '). Truncating to ' + MAX_STEPS + '.');
    steps = steps.slice(0, MAX_STEPS);
  }

  for (var i = 0; i < steps.length; i++) {
    await this._playStep(steps[i]);
  }
};

AnimationQueue.prototype._playStep = async function(step) {
  var entityId = this._resolveEntityId(step);
  var targetState = EFFECT_TO_FSM_STATE[step.type];

  // Guard: FSM check
  if (!this.fsm.canTransition(entityId, targetState)) return;

  // Lock FSM
  this.fsm.transitionTo(entityId, targetState);

  // Handle weapon-type-specific attacks (projectile systems)
  if (step.type === 'ATTACK' && step.weaponType) {
    if (step.weaponType === 'mage' || step.weaponType === 'range') {
      var heroEl = document.getElementById(entityId);
      var monsterEl = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
      if (heroEl && monsterEl) {
        if (step.weaponType === 'mage') {
          var colors = { fire: '#ff8800', ice: '#4488ff', arcane: '#aa44ff' };
          var color = colors.fire;
          if (hero.equipped && hero.equipped.rightHandWeapon) {
            var n = (hero.equipped.rightHandWeapon.name || '').toLowerCase();
            if (n.indexOf('ice') !== -1 || n.indexOf('frost') !== -1) color = colors.ice;
            else if (n.indexOf('arcane') !== -1 || n.indexOf('void') !== -1) color = colors.arcane;
          }
          createProjectile(heroEl, monsterEl, color, false);
          // Projectile flight delay
          await new Promise(function(r) { setTimeout(r, 380); });
          createExplosion(monsterEl, color);
        } else {
          // Range: arc arrow
          createProjectile(heroEl, monsterEl, '#88ccff', true);
          await new Promise(function(r) { setTimeout(r, 430); });
          monsterEl.classList.add('animate-flash-white');
          var hr = monsterEl.getBoundingClientRect();
          floatText(hr.left + hr.width/2 - 20, hr.top - 10, 'HIT!', 'damage');
          await new Promise(function(r) { setTimeout(r, 400); });
          monsterEl.classList.remove('animate-flash-white');
        }
      }
      // Advance FSM after projectile attack
      if (targetState === 'ATTACKING') {
        this.fsm.transitionTo(entityId, 'RECOVERY');
        this.fsm.transitionTo(entityId, 'IDLE');
      }
      return;
    }
  }

  // Standard CSS-class-based animation for all other step types
  var classNames = EFFECT_TO_CSS_CLASS[step.type];

  // Resolve DOM element
  var el = document.getElementById(entityId);
  if (!el) return;

  if (!classNames || classNames.length === 0) return;

  // Read CSS duration
  var durationMs = this.getAnimDuration(classNames[0]);

  // Apply CSS classes
  el.classList.add.apply(el.classList, classNames);

  // Await animationend with timeout fallback
  await new Promise(function(resolve) {
    var resolved = false;
    function onEnd() {
      if (!resolved) { resolved = true; el.removeEventListener('animationend', onEnd); resolve(); }
    }
    el.addEventListener('animationend', onEnd, { once: true });
    setTimeout(function() {
      if (!resolved) { resolved = true; el.removeEventListener('animationend', onEnd); resolve(); }
    }, durationMs + TIMEOUT_GUARD_MS);
  });

  // Remove CSS classes
  el.classList.remove.apply(el.classList, classNames);

  // Advance FSM
  if (targetState === 'DEAD') {
    // Stay dead
  } else if (targetState === 'ATTACKING') {
    this.fsm.transitionTo(entityId, 'IMPACT');
    this.fsm.transitionTo(entityId, 'RECOVERY');
    this.fsm.transitionTo(entityId, 'IDLE');
  } else {
    this.fsm.transitionTo(entityId, 'RECOVERY');
    this.fsm.transitionTo(entityId, 'IDLE');
  }
};

AnimationQueue.prototype._resolveEntityId = function(step) {
  if (step.entityId !== null) return step.entityId;
  var focus = document.querySelector('.monster-card.is-focus');
  if (focus && focus.id) return focus.id;
  var first = document.querySelector('.monster-card');
  if (first && first.id) return first.id;
  return 'monster-focus';
};

// ─── Init Pipeline Globals ─────────────────────────────────
var animFSM = new EntityAnimFSM();
var animQueue = new AnimationQueue(animFSM);

// ─── Combat Log (step-based) ───────────────────────────────
function findPartyHero(partyHeroes, heroId) {
  for (var i = 0; i < partyHeroes.length; i++) {
    if (partyHeroes[i].heroId === heroId) return partyHeroes[i];
  }
  return null;
}

function addCombatLogEntry(step, next) {
  var round = next.round;
  if (!round) return;
  var roleLabel;

  switch (step.type) {
    case 'ATTACK':
      var heroData = findPartyHero(round.partyHeroes, step.entityId.replace('hero-', ''));
      roleLabel = heroData ? heroData.role.charAt(0).toUpperCase() + heroData.role.slice(1) : 'Hero';
      if (step.isCrit) addLog('crit', '[R' + round.round + '] ' + roleLabel + ' CRITS for ' + step.damage + '!');
      else addLog('damage', '[R' + round.round + '] ' + roleLabel + ' hits for ' + step.damage);
      break;
    case 'HEAL':
      addLog('heal', '[R' + round.round + '] +' + step.healAmount + ' HP healed');
      break;
    case 'BLOCK':
      addLog('block', '[R' + round.round + '] Tank blocks ' + step.damage + ' damage!');
      break;
    case 'DEATH':
      var deadHero = findPartyHero(round.partyHeroes, step.entityId.replace('hero-', ''));
      roleLabel = deadHero ? deadHero.role.charAt(0).toUpperCase() + deadHero.role.slice(1) : 'Hero';
      addLog('kill', '[R' + round.round + '] ' + roleLabel + ' has fallen!');
      break;
    case 'MONSTER_DEATH':
      addLog('kill', '[R' + round.round + '] ' + (prevState && prevState.round ? prevState.round.currentMonsterName : 'Monster') + ' defeated!');
      break;
    case 'MONSTER_APPEAR':
      addLog('info', 'Next: ' + round.currentMonsterName + ' appears!');
      break;
    case 'HIT':
      // HIT steps on heroes produce damage logs; HIT steps on monsters are logged by ATTACK
      if (step.entityId && step.entityId.indexOf('hero-') === 0) {
        var hitHero = findPartyHero(round.partyHeroes, step.entityId.replace('hero-', ''));
        if (hitHero && hitHero.role !== 'tank') {
          roleLabel = hitHero.role.charAt(0).toUpperCase() + hitHero.role.slice(1);
          addLog('damage', '[R' + round.round + '] ' + roleLabel + ' takes ' + step.damage + (step.isCrit ? ' (CRIT!)' : ''));
        }
      }
      break;
  }
}

// ─── Animate Transition (pipeline version) ─────────────────
async function animateTransition(prev, next) {
  if (!next.round || !prev.round) return;
  if (next.round.round <= prev.round.round) return;

  // Register entities in FSM
  if (next.round.partyHeroes) {
    next.round.partyHeroes.forEach(function(h) {
      animFSM.registerEntity('hero-' + h.heroId);
    });
  }
  animFSM.registerEntity('monster-focus');

  // Compute animation steps from round data
  var steps = computeAnimationSteps(prev.round, next.round);

  // Play steps via AnimationQueue
  await animQueue.playSteps(steps);

  // Update HP bars after animations
  if (next.monsters) updateMonsterBars(next.monsters);
  if (next.round.partyHeroes) updateHeroBars(next.round.partyHeroes);

  // Emit combat log entries from step metadata
  steps.forEach(function(s) { addCombatLogEntry(s, next); });
}

// ─── Projectile System ─────────────────────────────────────
function createProjectile(fromEl, toEl, color, isArc) {
  var arena = document.querySelector('.arena');
  var arenaRect = arena.getBoundingClientRect();
  var fromRect = fromEl.getBoundingClientRect();
  var toRect = toEl.getBoundingClientRect();

  var startX = fromRect.left + fromRect.width/2 - 6;
  var startY = fromRect.top + fromRect.height/2 - 6;
  var endX = toRect.left + toRect.width/2 - 6;
  var endY = toRect.top + 10;

  var proj = document.createElement('div');
  proj.className = 'projectile';
  proj.style.background = 'radial-gradient(circle, ' + color + ', ' + color + ')';
  proj.style.boxShadow = '0 0 16px ' + color;
  proj.style.left = startX + 'px';
  proj.style.top = startY + 'px';
  proj.style.width = '14px';
  proj.style.height = '14px';
  document.body.appendChild(proj);

  // Particle trail
  var trailInterval = setInterval(function() {
    var trail = document.createElement('div');
    trail.className = 'projectile-trail';
    trail.style.background = color;
    trail.style.opacity = '0.5';
    trail.style.width = '8px';
    trail.style.height = '8px';
    trail.style.left = proj.style.left;
    trail.style.top = proj.style.top;
    document.body.appendChild(trail);
    setTimeout(function() { trail.remove(); }, 300);
  }, 50);

  if (isArc) {
    var midX = (startX + endX) / 2;
    var midY = Math.min(startY, endY) - 80;
    var startTime = performance.now();
    var duration = 400;
    function animateArc(now) {
      var t = Math.min((now - startTime) / duration, 1);
      var t1 = 1 - t;
      var x = t1*t1*startX + 2*t1*t*midX + t*t*endX;
      var y = t1*t1*startY + 2*t1*t*midY + t*t*endY;
      proj.style.left = x + 'px';
      proj.style.top = y + 'px';
      if (t < 1) requestAnimationFrame(animateArc);
      else { clearInterval(trailInterval); proj.remove(); }
    }
    requestAnimationFrame(animateArc);
  } else {
    proj.style.transition = 'left .35s ease-in, top .35s ease-in';
    requestAnimationFrame(function() {
      proj.style.left = endX + 'px';
      proj.style.top = endY + 'px';
    });
    setTimeout(function() { clearInterval(trailInterval); proj.remove(); }, 400);
  }
}

function createExplosion(el, color) {
  var rect = el.getBoundingClientRect();
  var cx = rect.left + rect.width/2;
  var cy = rect.top + 10;
  for (var i = 0; i < 8; i++) {
    var spark = document.createElement('div');
    spark.className = 'projectile-trail animate-explode';
    spark.style.background = color;
    spark.style.width = '6px';
    spark.style.height = '6px';
    spark.style.left = (cx - 3) + 'px';
    spark.style.top = (cy - 3) + 'px';
    spark.style.setProperty('--tx', Math.cos(i * Math.PI/4) * 30 + 'px');
    spark.style.setProperty('--ty', Math.sin(i * Math.PI/4) * 30 + 'px');
    document.body.appendChild(spark);
    spark.addEventListener('animationend', function() { spark.remove(); }, { once: true });
  }
  el.classList.add('animate-flash-white');
  var rect2 = el.getBoundingClientRect();
  floatText(rect2.left + rect2.width/2 - 20, rect2.top - 15, 'BOOM!', 'crit');
  el.addEventListener('animationend', function() { el.classList.remove('animate-flash-white'); }, { once: true });
}

// ─── Enter Dungeon ─────────────────────────────────────────
function enterDungeon() {
  var floor = parseInt(document.getElementById('floor-select').value);
  var btn = document.getElementById('enter-btn');
  btn.disabled = true;
  btn.textContent = 'Entering...';

  fetch('/api/heroes/' + hero.id + '/combat/start', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floor }),
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    document.getElementById('dungeon-setup').style.display = 'none';
    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('combat-log').innerHTML = '';
    prevState = null;

    // Render heroes from the start response
    if (data.heroes && data.heroes.length > 0) {
      renderPartyHeroes(data.heroes);
    }

    if (combatInterval) clearInterval(combatInterval);
    combatInterval = setInterval(pollCombat, 1500);
    return pollCombat();
  })
  .catch(function(err) { alert(err.message); })
  .finally(function() {
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="sword" style="width:16px;height:16px"></i> Enter Dungeon';
  });
}

document.getElementById('enter-btn').addEventListener('click', enterDungeon);

// ─── Poll Combat ───────────────────────────────────────────
var prevMonsterIds = null;

function pollCombat() {
  return fetch('/api/heroes/' + hero.id + '/combat/status', {
    headers: { 'Authorization': 'Bearer ' + token },
  })
  .then(function(res) { return res.json(); })
  .then(function(state) {
    if (state.round) {
      document.getElementById('round-counter').textContent = 'Round ' + state.round.round;
    }

    if (prevState) {
      animateTransition(prevState, state);

      // Re-render monsters when lineup changes (monster died, new one appears)
      if (state.monsters && prevState.monsters) {
        var currMonIds = state.monsters.map(function(m) { return m.id; }).sort().join(',');
        var prevMonIds = prevState.monsters.map(function(m) { return m.id; }).sort().join(',');
        if (currMonIds !== prevMonIds) {
          renderMonsters(state.monsters);
        } else {
          updateMonsterBars(state.monsters);
        }
      }
      if (state.round && state.round.partyHeroes) {
        updateHeroBars(state.round.partyHeroes);
      }
    } else {
      if (state.monsters) {
        renderMonsters(state.monsters);
        prevMonsterIds = state.monsters.map(function(m) { return m.id; });
      }
      if (state.round && state.round.partyHeroes) {
        renderPartyHeroes(state.round.partyHeroes);
      }
      if (state.round) addLog('info', state.round.currentMonsterName + ' appears!');
    }

    prevState = state;

    if (state.finished) {
      if (combatInterval) { clearInterval(combatInterval); combatInterval = null; }
      showResult(state);
    }
  })
  .catch(function(err) { console.error('Poll failed:', err); });
}

// ─── Result ────────────────────────────────────────────────
function showResult(state) {
  var overlay = document.getElementById('result-overlay');
  var title = document.getElementById('result-title');
  var icon = document.getElementById('result-icon');
  var details = document.getElementById('result-details');
  var retryBtn = document.getElementById('result-retry-btn');
  var loopSummary = document.getElementById('result-loop-summary');

  var won = state.floorCompleted;
  title.className = won ? 'victory' : 'defeat';
  title.textContent = won ? 'VICTORY!' : 'DEFEAT';
  icon.innerHTML = won ? '<i data-lucide="trophy" style="width:48px;height:48px"></i>' : '<i data-lucide="skull" style="width:48px;height:48px"></i>';
  if (typeof lucide !== 'undefined') lucide.createIcons();

  var r = state.result || {};
  var roundInfo = state.round || {};
  details.innerHTML = '';

  if (won) {
    details.innerHTML = 'Cleared in ' + (r.totalRounds || roundInfo.round || '?') + ' rounds!' +
      '<br />Monsters defeated: ' + (r.monstersDefeated || 0) + '/' + (r.totalMonsters || '?') +
      '<br />Gold earned: <strong style="color:#fbbf24">' + (r.goldEarned || 0) + '</strong>';
  } else {
    details.innerHTML = 'Your party was defeated.<br />';
    if (state.round && state.round.currentMonsterName) {
      details.innerHTML += 'Felled by: ' + state.round.currentMonsterName;
    }
  }

  // Loop tracking
  if (won) {
    loopCount++;
    totalGoldEarned += r.goldEarned || 0;
  }
  if (isLooping && won) {
    document.getElementById('loop-run-count').textContent = loopCount;
    document.getElementById('loop-total-gold').textContent = totalGoldEarned;
    loopSummary.style.display = 'block';
  } else {
    loopSummary.style.display = 'none';
  }

  // Update hero from result if available
  if (state.hero) {
    updateHeroBar(state.hero);
    hero.gold = state.hero.gold;
    hero.stats = state.hero.stats;
    hero.level = state.hero.level;
  }

  if (isLooping && won) {
    // Auto retry
    retryBtn.style.display = 'none';
    overlay.classList.add('show');
    setTimeout(function() {
      overlay.classList.remove('show');
      loopRetry();
    }, 1500);
  } else {
    retryBtn.style.display = won ? 'inline-flex' : 'none';
    overlay.classList.add('show');
  }
}

document.getElementById('result-btn').addEventListener('click', function() {
  document.getElementById('result-overlay').classList.remove('show');
  if (isLooping) {
    // Stop looping on manual dismiss during defeat
    if (document.getElementById('result-title').textContent === 'DEFEAT') {
      toggleLoop();
    }
  }
});

document.getElementById('result-retry-btn').addEventListener('click', function() {
  document.getElementById('result-overlay').classList.remove('show');
  loopRetry();
});

function loopRetry() {
  // Reset arena for next run
  prevState = null;
  document.getElementById('combat-log').innerHTML = '';
  document.getElementById('boss-row').innerHTML = '';
  document.getElementById('monster-row').innerHTML = '';
  document.getElementById('hero-row').innerHTML = '';

  // Re-enter
  var floor = parseInt(document.getElementById('floor-select').value);
  fetch('/api/heroes/' + hero.id + '/combat/start', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floor }),
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() {
    if (combatInterval) clearInterval(combatInterval);
    combatInterval = setInterval(pollCombat, 1500);
    return pollCombat();
  })
  .catch(function(err) { alert(err.message); isLooping = false; updateLoopUI(); });
}

// ─── Loop Toggle ───────────────────────────────────────────
function toggleLoop() {
  isLooping = !isLooping;
  if (!isLooping) {
    loopCount = 0;
    totalGoldEarned = 0;
  }
  updateLoopUI();
}

function updateLoopUI() {
  var btn = document.getElementById('loop-btn');
  var info = document.getElementById('loop-info');
  if (isLooping) {
    btn.classList.add('active');
    btn.innerHTML = '<i data-lucide="square" style="width:16px;height:16px"></i> STOP';
    info.classList.add('show');
    info.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Looping | Runs: <strong id="run-count-display">' + loopCount + '</strong> | Gold: <strong id="gold-count-display">' + totalGoldEarned + '</strong>';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '<i data-lucide="refresh-cw" style="width:16px;height:16px"></i> LOOP';
    info.classList.remove('show');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

document.getElementById('loop-btn').addEventListener('click', toggleLoop);

// ─── Utility ───────────────────────────────────────────────
function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ─── Init ──────────────────────────────────────────────────
var loopInfoEl = document.getElementById('loop-info');
console.log('[Game] Loaded hero: ' + hero.name + ' (Lv.' + hero.level + ')');
if (typeof lucide !== 'undefined') lucide.createIcons();

// ─── Equipment ─────────────────────────────────────────────
var SLOT_NAMES = {
  rightHandWeapon: 'Main-Hand',
  leftHand: 'Off-Hand',
  helmet: 'Helmet',
  body: 'Body',
  legs: 'Legs',
  boots: 'Boots',
  gloves: 'Gloves',
  necklace: 'Amulet',
  leftRing: 'Ring',
  rightRing: 'Ring',
  leftEarring: 'Earring',
  rightEarring: 'Earring'
};

var SLOT_ORDER = ['rightHandWeapon','leftHand','helmet','body','legs','boots','gloves','necklace','leftRing','rightRing','leftEarring','rightEarring'];

var rarityColors = { common:'#aaa', uncommon:'#22c55e', rare:'#3b82f6', epic:'#a855f7', legendary:'#f59e0b' };

function getItemEmoji(slot, type) {
  var weaponSlots = ['rightHandWeapon','leftHand'];
  var armorSlots = ['helmet','body','legs','boots','gloves'];
  var accessorySlots = ['necklace','leftRing','rightRing','leftEarring','rightEarring'];
  if (weaponSlots.indexOf(slot) !== -1) {
    if (type === 'mage') return 'wand';
    if (type === 'range') return 'crosshair';
    return 'sword';
  }
  if (armorSlots.indexOf(slot) !== -1) return 'shield';
  if (accessorySlots.indexOf(slot) !== -1) return 'gem';
  return 'shield';
}

function getMainStat(item) {
  var weaponSlots = ['rightHandWeapon','leftHand'];
  var armorSlots = ['helmet','body','legs','boots','gloves'];
  if (weaponSlots.indexOf(item.slot) !== -1) return 'ATK:' + (item.stats.atk || 0);
  if (armorSlots.indexOf(item.slot) !== -1) return 'DEF:' + (item.stats.def || 0);
  return 'HP:' + (item.stats.hp || 0);
}

function loadEquipment() {
  renderEquipmentSlots(hero.equipped || {});
  renderInventory(hero.inventory || []);
}

function renderEquipmentSlots(equipped) {
  var grid = document.getElementById('equip-grid');
  grid.innerHTML = '';
  for (var i = 0; i < SLOT_ORDER.length; i++) {
    var slot = SLOT_ORDER[i];
    var slotName = SLOT_NAMES[slot];
    var item = equipped[slot];
    var div = document.createElement('div');
    div.className = 'equip-slot';
    div.dataset.slot = slot;

    var label = document.createElement('div');
    label.className = 'slot-label';
    label.textContent = slotName;
    div.appendChild(label);

    if (item) {
      var color = rarityColors[item.rarity] || '#aaa';
      var content = document.createElement('div');
      content.className = 'slot-equipped';
      content.innerHTML =
        '<div class="item-icon"><i data-lucide="' + getItemEmoji(slot, item.type) + '" style="width:22px;height:22px"></i></div>' +
        '<div class="item-name" style="color:' + color + '">' + escHtml(item.name) + '</div>' +
        '<div class="item-stat" style="color:' + color + '">' + getMainStat(item) + '</div>' +
        '<div class="item-level">Lv.' + item.level + ' \\u00B7 ' + item.rarity.toUpperCase() + '</div>';
      div.appendChild(content);

      var unequipBtn = document.createElement('button');
      unequipBtn.className = 'btn btn-danger btn-sm';
      unequipBtn.style.cssText = 'margin-top:6px;width:auto;padding:3px 10px;font-size:.72rem';
      unequipBtn.textContent = 'UNEQUIP';
      unequipBtn.addEventListener('click', (function(s) { return function() { unequipItem(s); }; })(slot));
      div.appendChild(unequipBtn);
    } else {
      var empty = document.createElement('div');
      empty.className = 'slot-empty';
      empty.textContent = '(empty)';
      div.appendChild(empty);
    }

    grid.appendChild(div);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderInventory(inventory) {
  var container = document.getElementById('equip-inventory');
  var countEl = document.getElementById('inv-count');
  container.innerHTML = '';
  countEl.textContent = '(' + inventory.length + ' items)';

  if (inventory.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#555577">No items in inventory.</div>';
    return;
  }

  for (var i = 0; i < inventory.length; i++) {
    var item = inventory[i];
    var color = rarityColors[item.rarity] || '#aaa';
    var card = document.createElement('div');
    card.className = 'inv-item';

    var icon = document.createElement('div');
    icon.className = 'inv-icon';
    icon.innerHTML = '<i data-lucide="' + getItemEmoji(item.slot, item.type) + '" style="width:24px;height:24px"></i>';
    card.appendChild(icon);

    var info = document.createElement('div');
    info.className = 'inv-info';
    info.innerHTML =
      '<div class="inv-name" style="color:' + color + '">' + escHtml(item.name) + '</div>' +
      '<div class="inv-stats">' + escHtml(SLOT_NAMES[item.slot] || item.slot) + ' \\u00B7 ' + getMainStat(item) + ' \\u00B7 Lv.' + item.level + ' \\u00B7 ' + item.rarity.toUpperCase() + '</div>';
    card.appendChild(info);

    var equipBtn = document.createElement('button');
    equipBtn.className = 'btn btn-primary btn-sm';
    equipBtn.textContent = 'EQUIP';
    equipBtn.style.cssText = 'width:auto;padding:5px 14px';
    equipBtn.addEventListener('click', (function(id, s) { return function() { equipItem(id, s); }; })(item.id, item.slot));
    card.appendChild(equipBtn);

    container.appendChild(card);
  }
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function equipItem(itemId, slot) {
  fetch('/api/heroes/' + hero.id + '/equip', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipmentId: itemId, slot: slot })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { return refreshHero(); })
  .catch(function(err) { alert('Failed to equip: ' + err.message); });
}

function unequipItem(slot) {
  fetch('/api/heroes/' + hero.id + '/unequip', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: slot })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { return refreshHero(); })
  .catch(function(err) { alert('Failed to unequip: ' + err.message); });
}

function refreshHero() {
  return fetch('/api/heroes/' + hero.id, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.hero) {
      hero = data.hero;
      updateHeroBar(hero);
      loadEquipment();
    }
  })
  .catch(function(err) { console.error('Failed to refresh hero:', err); });
}

// ─── Party ──────────────────────────────────────────────────
function loadParty() {
  document.getElementById('party-not-in').style.display = 'none';
  document.getElementById('party-in').style.display = 'none';
  document.getElementById('party-invites').style.display = 'none';

  fetch('/api/party', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.party) {
      showPartyNotInParty();
      return;
    }
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function() {
    showPartyNotInParty();
  });
}

function showPartyNotInParty() {
  document.getElementById('party-not-in').style.display = 'block';
  document.getElementById('party-in').style.display = 'none';
  document.getElementById('party-invites').style.display = 'none';
}

function showPartyInParty(party) {
  document.getElementById('party-not-in').style.display = 'none';
  document.getElementById('party-in').style.display = 'block';
  document.getElementById('party-title').textContent = party.name;
  document.getElementById('party-info').textContent = 'Members: ' + party.memberCount + '/' + party.maxSize + ' \\u00B7 Floor ' + party.currentFloor;

  var membersDiv = document.getElementById('party-members');
  membersDiv.innerHTML = '';

  for (var i = 0; i < party.members.length; i++) {
    var m = party.members[i];
    var card = document.createElement('div');
    card.className = 'member-card';

    var roleUpper = m.role.toUpperCase();
    var roleClass = 'role-' + m.role;

    var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
      '<span style="font-weight:600;color:#e0e0e0">' + escHtml(m.username) + '</span>' +
      '<span class="role-badge ' + roleClass + '">' + roleUpper + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:12px;font-size:.8rem;color:#8888aa;margin-bottom:4px">' +
      '<span style="color:#fbbf24"><i data-lucide="sword" style="width:12px;height:12px"></i> ' + (m.stats.atk ?? 0) + '</span>' +
      '<span style="color:#7c3aed"><i data-lucide="shield" style="width:12px;height:12px"></i> ' + (m.stats.def ?? 0) + '</span>' +
      '<span style="color:#22c55e"><i data-lucide="heart" style="width:12px;height:12px"></i> ' + (m.stats.hp ?? 0) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;font-size:.75rem">' +
      (m.isOnline ? '<span style="color:#22c55e"><i data-lucide="circle" style="width:8px;height:8px;fill:#22c55e"></i> Online</span>' : '<span style="color:#555577"><i data-lucide="circle" style="width:8px;height:8px"></i> Offline</span>');

    if (m.isBot) {
      html += '<button onclick="removeBot(&apos;' + m.playerId + '&apos;)" style="color:red;border:1px solid red;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;cursor:pointer;margin-left:auto"><i data-lucide="x" style="width:12px;height:12px"></i> Remove Bot</button>';
    }

    if (m.playerId === hero.playerId) {
      html += '<button onclick="changeRole()" style="border:1px solid #7c3aed;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;color:#7c3aed;cursor:pointer;margin-left:auto">Change Role</button>';
    }

    html += '</div>';
    card.innerHTML = html;
    membersDiv.appendChild(card);
  }

  loadInvites();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function createParty() {
  var name = document.getElementById('party-name-input').value.trim();
  if (!name) return;

  fetch('/api/party/create', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    document.getElementById('party-name-input').value = '';
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

function joinParty() {
  var partyId = document.getElementById('party-join-input').value.trim();
  if (!partyId) return;

  fetch('/api/party/join', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId: partyId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    document.getElementById('party-join-input').value = '';
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

function invitePlayer() {
  var username = document.getElementById('invite-input').value.trim();
  if (!username) return;

  fetch('/api/party/invite', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    document.getElementById('invite-input').value = '';
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

function addBot() {
  var role = document.getElementById('bot-role-select').value;

  fetch('/api/party/bot', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: role })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

function removeBot(botId) {
  if (!confirm('Remove this bot from the party?')) return;

  fetch('/api/party/bot/' + botId, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    if (data.party) {
      currentParty = data.party;
      showPartyInParty(data.party);
    } else {
      currentParty = null;
      showPartyNotInParty();
    }
  })
  .catch(function(err) { alert(err.message); });
}

function leaveParty() {
  if (!confirm('Leave the party?')) return;

  fetch('/api/party/leave', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() {
    currentParty = null;
    showPartyNotInParty();
  })
  .catch(function(err) { alert(err.message); });
}

function changeRole() {
  if (!currentParty) return;

  var currentRole = 'dps';
  for (var i = 0; i < currentParty.members.length; i++) {
    if (currentParty.members[i].playerId === hero.playerId) {
      currentRole = currentParty.members[i].role;
      break;
    }
  }

  var roles = ['tank', 'dps', 'healer'];
  var nextIdx = (roles.indexOf(currentRole) + 1) % roles.length;
  var nextRole = roles[nextIdx];

  fetch('/api/party/role', {
    method: 'PUT',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: nextRole })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

function loadInvites() {
  fetch('/api/party/invites', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var container = document.getElementById('invites-list');
    var section = document.getElementById('party-invites');
    container.innerHTML = '';

    if (!data.invites || data.invites.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    for (var i = 0; i < data.invites.length; i++) {
      var inv = data.invites[i];
      var div = document.createElement('div');
      div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#0d0d1f;border:1px solid #1a1a3e;border-radius:6px;margin:4px 0';
      div.innerHTML = '<span style="color:#e0e0e0;font-weight:600">' + escHtml(inv.partyName) + '</span>' +
        '<button onclick="acceptInvite(&apos;' + inv.partyId + '&apos;)" class="btn btn-primary btn-sm" style="width:auto">Accept</button>';
      container.appendChild(div);
    }
  })
  .catch(function() {});
}

function acceptInvite(partyId) {
  fetch('/api/party/join', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ partyId: partyId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    currentParty = data.party;
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
}

// ─── Photo Upload ──────────────────────────────────────────
document.getElementById('hero-avatar-wrap').addEventListener('click', function() {
  document.getElementById('hero-photo-input').click();
});
document.getElementById('hero-avatar-img').onerror = function() { this.style.display = 'none'; };
document.getElementById('hero-photo-input').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var formData = new FormData();
  formData.append('photo', file);
  fetch('/api/heroes/' + hero.id + '/photo', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (data.error) { alert(data.error); return; }
    var img = document.getElementById('hero-avatar-img');
    img.src = data.photoUrl;
    img.style.display = '';
    document.getElementById('hero-avatar-placeholder').style.display = 'none';
  })
  .catch(function(err) { console.error('Photo upload failed:', err); });
});

</script>
</body>
</html>`;
}

// ─── GET /game/:heroId — main game page ─────────────────
router.get("/:heroId", async (req, res) => {
  const hero = await heroService.getHero(req.params.heroId);
  if (!hero) {
    res.status(404).type("html").send("<h1>Hero Not Found</h1>");
    return;
  }
  res.type("html").send(generateGameHtml(hero));
});

export default router;
