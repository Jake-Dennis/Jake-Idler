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
  <div id="loginScreen" class="screen">
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
  <div id="heroScreen" class="screen active">
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
<div class="hero-bar animate-torch-flicker" id="hero-bar">
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
  <span class="h-stat">
    <label for="floor-select" style="color:#4a454a;font-weight:700;font-size:.7rem;letter-spacing:1px;margin-right:4px">FLOOR</label>
    <select id="floor-select" style="padding:2px 6px;background:#0a080a;border:1px solid #2a2020;border-radius:4px;color:#9a949a;font-size:.8rem;cursor:pointer"></select>
  </span>
  <button id="start-btn" class="btn btn-primary btn-sm" title="Start dungeon run"><i data-lucide="sword" style="width:14px;height:14px"></i> Start</button>
  <button id="stop-btn" style="display:none;background:transparent;border:1px solid #4a2020;border-radius:4px;color:#6a2525;font-size:.7rem;cursor:pointer;padding:4px 8px" title="Stop dungeon run"><i data-lucide="square" style="width:14px;height:14px"></i> Stop</button>
  <button id="loop-btn" class="btn btn-loop btn-sm" title="Toggle dungeon loop"><i data-lucide="refresh-cw" style="width:14px;height:14px"></i> LOOP</button>
  <button id="shake-toggle" style="background:transparent;border:1px solid #2a2020;border-radius:4px;color:#5a555a;font-size:.7rem;cursor:pointer;padding:2px 6px" title="Toggle screen shake">Shake</button>
</div>

<!-- ═══════════ TABS ═══════════ -->
<div class="tab-bar">
  <button class="tab active" data-tab="dungeon"><i data-lucide="sword" style="width:16px;height:16px"></i> Dungeon</button>
  <button class="tab" data-tab="equipment"><i data-lucide="shield" style="width:16px;height:16px"></i> Equipment</button>
  <button class="tab" data-tab="party"><i data-lucide="users" style="width:16px;height:16px"></i> Party</button>
  <button class="tab" data-tab="crafting"><i data-lucide="hammer" style="width:16px;height:16px"></i> Crafting</button>
</div>

<!-- ═══════════ TAB: DUNGEON ═══════════ -->
<div id="tab-dungeon" class="tab-content active">

  <div id="combat-arena">
    <div class="round-counter" id="round-counter">Round 0</div>

    <div class="arena">
      <div class="arena-row" id="boss-row"></div>
      <div class="arena-row" id="monster-row"></div>
      <div id="arena-divider" style="border-top:1px solid #1a1518;margin:6px 0"></div>
      <div class="hero-row" id="hero-row"></div>
      <div class="vignette-flash" id="vignette-flash"></div>
      <div class="floor-announce" id="floor-announce"></div>
    </div>

    <button id="log-toggle" style="background:transparent;border:1px solid #1a1518;border-radius:3px;color:#4a454a;font-size:.65rem;cursor:pointer;padding:2px 8px;margin-top:4px;align-self:center">Hide log</button>
    <div class="combat-log" id="combat-log"></div>

    <div id="loop-info" class="loop-info"></div>
  </div>
</div>

<!-- ═══════════ TAB: EQUIPMENT ═══════════ -->
<div id="tab-equipment" class="tab-content">
  <div class="equip-character">
    <div class="equip-stats-panel" id="equip-stats-panel"></div>
    <div class="equip-body-grid" id="equip-grid"></div>
    <div class="equip-inventory-panel">
      <div class="equip-section-title" style="margin-bottom:6px">Inventory <span class="inv-count" id="inv-count"></span></div>
      <div class="equip-inventory-wrap" id="equip-inventory"></div>
    </div>
  </div>
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

<!-- ═══════════ TAB: CRAFTING ═══════════ -->
<div id="tab-crafting" class="tab-content">
  <div class="craft-layout">
    <div class="craft-panel">
      <div class="craft-section-title">Shards</div>
      <div id="craft-shard-list" class="craft-shard-list"></div>

      <div class="craft-section-title" style="margin-top:16px">Salvage Equipment</div>
      <div id="craft-salvage-list" class="craft-salvage-list"></div>
    </div>

    <div class="craft-panel">
      <div class="craft-section-title">Craft Gear</div>
      <div class="craft-form">
        <div class="craft-row">
          <label>Slot</label>
          <select id="craft-slot"><option value="">—</option></select>
        </div>
        <div class="craft-row">
          <label>Type</label>
          <select id="craft-type"><option value="">—</option></select>
        </div>
        <div class="craft-row">
          <label>Rarity</label>
          <select id="craft-rarity">
            <option value="common">Common</option>
            <option value="uncommon">Uncommon</option>
            <option value="rare">Rare</option>
            <option value="epic">Epic</option>
            <option value="legendary">Legendary</option>
          </select>
        </div>
        <div id="craft-cost-display" class="craft-cost"></div>
        <button id="craft-btn" class="btn btn-primary" style="width:100%">Craft</button>
        <div id="craft-result" class="craft-result"></div>
      </div>

      <div class="craft-section-title" style="margin-top:16px">Convert Shard → Gold</div>
      <div id="craft-convert-list" class="craft-shard-list"></div>
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
var inCombat = false;
var showingResult = false;
var combatGen = 0;
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
    if (this.dataset.tab === 'crafting') loadCrafting();
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
})();

// ─── Hero Bar ──────────────────────────────────────────────
function updateHeroBar(h) {
  if (!h) return;
  document.getElementById('hero-bar-name').textContent = h.name || hero.name;
  document.getElementById('hero-bar-level').textContent = h.level || hero.level;
  document.getElementById('hero-bar-atk').textContent = h.stats ? h.stats.atk : hero.stats.atk;
  document.getElementById('hero-bar-def').textContent = h.stats ? h.stats.def : hero.stats.def;
  document.getElementById('hero-bar-gold').textContent = h.gold != null ? h.gold : hero.gold;
  var hp = h.hp != null ? h.hp : (h.stats ? h.stats.hp : hero.stats.hp);
  var maxHp = h.maxHp != null ? h.maxHp : hp;
  document.getElementById('hero-bar-hp').textContent = Math.round(hp);
  document.getElementById('hero-bar-maxhp').textContent = Math.round(maxHp);
  var bar = document.getElementById('hero-bar-hp-fill');
  var pct = maxHp > 0 ? (hp / maxHp) * 100 : 100;
  bar.style.width = pct + '%';
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
  // Add random offset to prevent overlapping
  var offsetX = (Math.random() - 0.5) * 40;
  var offsetY = (Math.random() - 0.5) * 20;
  el.style.left = (x + offsetX) + 'px';
  el.style.top = (y + offsetY) + 'px';
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
    var icon;
    if (m.isBoss && m.name && m.name.toLowerCase().indexOf('skeleton') !== -1) {
      icon = '<img src="/assets/Boss/Boss-Viciouse-Skeleton.png" style="width:56px;height:56px;object-fit:contain;display:block;margin:0 auto" alt="Skeleton Boss">';
    } else if (m.isBoss) {
      icon = '<i data-lucide="skull" style="width:36px;height:36px"></i>';
    } else if (m.name && m.name.toLowerCase().indexOf('skeleton') !== -1) {
      icon = '<img src="/assets/Trash-Mobs/Aggressive%20skeleton%20warrior%20in%20battle%20stance.png" style="width:44px;height:44px;object-fit:contain;display:block;margin:0 auto" alt="Skeleton">';
    } else {
      icon = '<i data-lucide="bug" style="width:22px;height:22px"></i>';
    }
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
      var heroName = (h.heroId === hero.id) ? hero.name : (h.name || h.heroId.substring(0, 10));
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
        '<div class="hero-hp"><i data-lucide="' + (icons[role] || 'sword') + '" style="width:12px;height:12px;margin-right:4px;vertical-align:middle"></i><span class="hero-hp-text">' + Math.round(h.hp) + '/' + Math.round(h.maxHp) + '</span></div>';
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
    var hpText = el.querySelector('.monster-hp');
    if (hpText) hpText.textContent = Math.round(m.hp) + '/' + Math.round(m.maxHp);
    var pct = m.maxHp > 0 ? (m.hp / m.maxHp) * 100 : 0;
    var bar = el.querySelector('.hp-bar-inner');
    if (bar) {
      bar.style.width = pct + '%';
      bar.className = 'hp-bar-inner ' + hpColorClass(m.hp, m.maxHp);
    }
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
    var hpText = el.querySelector('.hero-hp-text');
    if (hpText) hpText.textContent = Math.round(h.hp) + '/' + Math.round(h.maxHp);

    // Update hero bar (top menu) for player's hero
    if (h.heroId === hero.id) {
      document.getElementById('hero-bar-hp').textContent = Math.round(h.hp);
      document.getElementById('hero-bar-maxhp').textContent = Math.round(h.maxHp);
      var topBar = document.getElementById('hero-bar-hp-fill');
      if (topBar) {
        topBar.style.width = pct + '%';
        topBar.className = 'hp-bar-inner ' + hpColorClass(h.hp, h.maxHp);
      }
    }
  });
}



// ─── AnimationQueue (removed — replaced by inline animateTransition) ──

var DURATION_CACHE = {};

// ─── DIY Particle System ────────────────────────────────────
var PARTICLE_POOL = [];
var PARTICLE_POOL_SIZE = 30;
var PARTICLE_COLORS = {
  hit: ['#ff8800', '#ffaa44', '#ffcc66', '#ffffff'],
  death: ['#884422', '#664422', '#442211', '#ff4444'],
  heal: ['#44cc44', '#66ee66', '#88ff88', '#aaffaa'],
  block: ['#6688ff', '#88aaff', '#aaccff', '#ffffff']
};
for (var pi = 0; pi < PARTICLE_POOL_SIZE; pi++) {
  var p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:500;opacity:0;transition:none';
  document.body.appendChild(p);
  PARTICLE_POOL.push(p);
}
var PARTICLE_IDX = 0;
function emitParticles(type, x, y, count) {
  var colors = PARTICLE_COLORS[type] || PARTICLE_COLORS.hit;
  for (var i = 0; i < (count || 8); i++) {
    var p = PARTICLE_POOL[PARTICLE_IDX % PARTICLE_POOL_SIZE]; PARTICLE_IDX++;
    var angle = Math.random() * Math.PI * 2;
    var speed = 40 + Math.random() * 80;
    var distX = Math.cos(angle) * speed;
    var distY = Math.sin(angle) * speed - 20;
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = 'position:fixed;width:' + (4 + Math.random() * 4) + 'px;height:' + (4 + Math.random() * 4) + 'px;border-radius:50%;pointer-events:none;z-index:500;background:' + color + ';box-shadow:0 0 4px ' + color + ';left:' + x + 'px;top:' + y + 'px;opacity:1;transition:all ' + (300 + Math.random() * 200) + 'ms ease-out';
    p.style.transform = 'translate(' + distX + 'px,' + distY + 'px) scale(0.3)';
    (function(part) { setTimeout(function() { part.style.opacity = '0'; }, 20); })(p);
    (function(part) { setTimeout(function() { part.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:500;opacity:0;transition:none'; }, 600); })(p);
  }
}



// ─── Animate Transition (simplified — event-driven playback) ─
async function animateTransition(prev, next) {
  if (!next.round || !prev.round) return;
  if (next.round.round <= prev.round.round) return;

  // Compare hero data between rounds and play animations
  if (next.round.partyHeroes && prev.round.partyHeroes) {
    // Phase 1: Fire all hero attack animations simultaneously
    var attackPromises = [];
    for (var hi = 0; hi < next.round.partyHeroes.length; hi++) {
      var h = next.round.partyHeroes[hi];
      var prevH = null;
      for (var pi = 0; pi < prev.round.partyHeroes.length; pi++) {
        if (prev.round.partyHeroes[pi].heroId === h.heroId) { prevH = prev.round.partyHeroes[pi]; break; }
      }
      if (!prevH) continue;

      if (h.damage > 0) {
        (function(heroData, prevHero) {
          attackPromises.push((async function() {
            var wType = (heroData.heroId === hero.id) ? getWeaponType() : 'melee';
            var el = document.getElementById('hero-' + heroData.heroId);
            var monEl = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
            if (!el) return;
            if (wType === 'mage' || wType === 'range') {
              if (monEl) {
                if (wType === 'mage') {
                  var colors = { fire: '#ff8800', ice: '#4488ff', arcane: '#aa44ff' };
                  var color = colors.fire;
                  if (hero.equipped && hero.equipped.rightHandWeapon) {
                    var n = (hero.equipped.rightHandWeapon.name || '').toLowerCase();
                    if (n.indexOf('ice') !== -1 || n.indexOf('frost') !== -1) color = colors.ice;
                    else if (n.indexOf('arcane') !== -1 || n.indexOf('void') !== -1) color = colors.arcane;
                  }
                  createProjectile(el, monEl, color, false);
                  await sleep(380);
                  createExplosion(monEl, color);
                } else {
                  createProjectile(el, monEl, '#88ccff', true);
                  await sleep(430);
                  monEl.classList.add('animate-flash-white');
                  var hr2 = monEl.getBoundingClientRect();
                  floatText(hr2.left + hr2.width/2 - 20, hr2.top - 10, 'HIT!', 'damage');
                  await sleep(400);
                  monEl.classList.remove('animate-flash-white');
                }
                if (heroData.crit) {
                  var arena = document.querySelector('.arena');
                  if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, 500); }
                }
              }
            } else {
              var animClass = (heroData.role === 'tank') ? 'animate-shield' : 'animate-slash';
              el.classList.add(animClass);
              await sleep(getAnimDuration(animClass) + 50);
              el.classList.remove(animClass);
              if (monEl) {
                monEl.classList.add('animate-hit-stop');
                await sleep(80);
                monEl.classList.remove('animate-hit-stop');
              }
            }
          })());
        })(h, prevH);
      }
    }
    // Wait for all attack animations to finish
    if (attackPromises.length > 0) await Promise.all(attackPromises);

    // Phase 2: Combined monster hit effects
    var totalDamage = 0;
    var anyCrit = false;
    for (var hi2 = 0; hi2 < next.round.partyHeroes.length; hi2++) {
      var h2 = next.round.partyHeroes[hi2];
      if (h2.damage > 0) {
        totalDamage += h2.damage;
        if (h2.crit) anyCrit = true;
        var monEl2 = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
        if (monEl2) {
          monEl2.classList.add('animate-flash-red', 'animate-shake', 'animate-hit-splat');
          var mr2 = monEl2.getBoundingClientRect();
          floatText(mr2.left + mr2.width/2 - 20, mr2.top - 10, Math.round(h2.damage), 'damage');
          emitParticles('hit', mr2.left + mr2.width/2, mr2.top + mr2.height/2, 6);
        }
      }
    }
    if (totalDamage > 0) {
      await animSleep('animate-flash-red');
      var monEl3 = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
      if (monEl3) monEl3.classList.remove('animate-flash-red', 'animate-shake');
      if (anyCrit) {
        var arena = document.querySelector('.arena');
        if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, getAnimDuration('animate-shake-screen') + 50); }
      }
    }

    await sleep(PHASE_GAP_MS);
    // ─── PHASE 3: DEFEND (all monsters attack simultaneously) ───
    var anyHeroHit = false;
    for (var hi3 = 0; hi3 < next.round.partyHeroes.length; hi3++) {
      var h3 = next.round.partyHeroes[hi3];
      if (h3.damageTaken > 0) { anyHeroHit = true; break; }
    }
    if (anyHeroHit) {
      var allMonsters = document.querySelectorAll('.monster-card');
      for (var mi = 0; mi < allMonsters.length; mi++) {
        var m = allMonsters[mi];
        if (m.classList.contains('boss')) { m.classList.add('animate-shake-screen'); } else { m.classList.add('animate-shake'); }
      }
      await animSleep('animate-shake');
      for (var mi2 = 0; mi2 < allMonsters.length; mi2++) { allMonsters[mi2].classList.remove('animate-shake-screen', 'animate-shake'); }
      for (var hi4 = 0; hi4 < next.round.partyHeroes.length; hi4++) {
        var h4 = next.round.partyHeroes[hi4];
        if (h4.damageTaken > 0) {
          var hel2 = document.getElementById('hero-' + h4.heroId);
          if (hel2) {
            hel2.classList.add('animate-flash-red', 'animate-shake');
            await animSleep('animate-flash-red');
            hel2.classList.remove('animate-flash-red', 'animate-shake');
            if (h4.role === 'tank') {
              var mCards = document.querySelectorAll('.monster-card');
              for (var bi = 0; bi < mCards.length; bi++) {
                hel2.classList.add('animate-shield', 'animate-block-burst');
                var br2 = hel2.getBoundingClientRect();
                emitParticles('block', br2.left + br2.width/2, br2.top + br2.height/2, 4);
                if (bi === 0) floatText(br2.left + br2.width/2 - 20, br2.top - 10, 'BLOCK', 'block');
                await animSleep('animate-block-burst');
                hel2.classList.remove('animate-shield', 'animate-block-burst');
              }
            }
          }
        }
      }
    }

    await sleep(PHASE_GAP_MS);
    // ─── PHASE 4: HEAL ───────────────────────────────────────
    for (var hi5 = 0; hi5 < next.round.partyHeroes.length; hi5++) {
      var h5 = next.round.partyHeroes[hi5];
      // Healer cast
      if (h5.healingDone > 0) {
        var casterEl = document.getElementById('hero-' + h5.heroId);
        if (casterEl) {
          casterEl.classList.add('animate-heal-cast');
          var cr = casterEl.getBoundingClientRect();
          floatText(cr.left + cr.width/2 - 20, cr.top - 10, '+' + Math.round(h5.healingDone), 'heal');
          await animSleep('animate-heal-cast');
          casterEl.classList.remove('animate-heal-cast');
        }
      }
      // Heal received
      if (h5.healingReceived > 0) {
        var hel = document.getElementById('hero-' + h5.heroId);
        if (hel) {
          var hr3 = hel.getBoundingClientRect();
          emitParticles('heal', hr3.left + hr3.width/2, hr3.top + hr3.height/2, 8);
          hel.classList.add('animate-heal-received');
          await animSleep('animate-heal-received');
          hel.classList.remove('animate-heal-received');
          floatText(hr3.left + hr3.width/2 - 20, hr3.top - 20, '+' + Math.round(h5.healingReceived), 'heal');
        }
      }
    }

    await sleep(PHASE_GAP_MS);
    // ─── PHASE 5: DEATHS ─────────────────────────────────────
    for (var hi6 = 0; hi6 < next.round.partyHeroes.length; hi6++) {
      var h6 = next.round.partyHeroes[hi6];
      var prevH6 = null;
      for (var pi6 = 0; pi6 < prev.round.partyHeroes.length; pi6++) {
        if (prev.round.partyHeroes[pi6].heroId === h6.heroId) { prevH6 = prev.round.partyHeroes[pi6]; break; }
      }
      if (!prevH6) continue;
      if (!h6.alive && prevH6.alive) {
        var hel3 = document.getElementById('hero-' + h6.heroId);
        if (hel3) {
          var rect3 = hel3.getBoundingClientRect();
          emitParticles('death', rect3.left + rect3.width/2, rect3.top + rect3.height/2, 12);
          hel3.classList.add('animate-fade-out');
          await animSleep('animate-fade-out');
        }
      }
    }
  }

  // Monster death
  if (next.round.monsterJustKilled && !prev.round.monsterJustKilled) {
    var target = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card');
    if (target) {
      var rect = target.getBoundingClientRect();
      // Big death particle burst
      emitParticles('death', rect.left + rect.width/2, rect.top + rect.height/2, 20);
      // Screen shake
      var arena = document.querySelector('.arena');
      if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, getAnimDuration('animate-shake-screen') + 50); }
      // Flash white then fade out
      target.classList.add('animate-flash-white');
      await animSleep('animate-flash-white');
      target.classList.remove('animate-flash-white');
      target.classList.add('animate-fade-out');
      await animSleep('animate-fade-out');
    }
  }

  // Update HP bars from snapshot
  if (next.monsters) updateMonsterBars(next.monsters);
  if (next.round && next.round.partyHeroes) updateHeroBars(next.round.partyHeroes);

  // Screen shake on crit
  var hasCrit = next.round && next.round.partyHeroes && next.round.partyHeroes.some(function(h) { return h.crit; });
  if (hasCrit) {
    var arena = document.querySelector('.arena');
    if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, getAnimDuration('animate-shake-screen') + 50); }
  }

  // Combat log
  if (next.round.partyHeroes) {
    next.round.partyHeroes.forEach(function(h) {
      if (h.damage > 0) addLog(h.crit ? 'crit' : 'damage', '[R' + next.round.round + '] ' + h.name + ' ' + (h.crit ? 'CRITS' : 'hits') + ' for ' + Math.round(h.damage));
      if (h.damageTaken > 0 && h.role !== 'tank') addLog('damage', '[R' + next.round.round + '] ' + h.name + ' takes ' + Math.round(h.damageTaken));
      if (h.damageTaken > 0 && h.role === 'tank') addLog('block', '[R' + next.round.round + '] ' + h.name + ' blocks ' + Math.round(h.damageTaken) + ' damage!');
      if (h.healingReceived > 0) addLog('heal', '[R' + next.round.round + '] +' + Math.round(h.healingReceived) + ' HP healed');
      if (!h.alive && prevH && prevH.alive) addLog('kill', '[R' + next.round.round + '] ' + h.name + ' has fallen!');
    });
  }
  if (next.round.monsterJustKilled && !prev.round.monsterJustKilled) {
    addLog('kill', '[R' + next.round.round + '] ' + prev.round.currentMonsterName + ' defeated!');
  }
}

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

// Wait for a CSS animation to finish by reading its duration from the live style.
// The 50ms buffer covers class toggling + reflow. Single source of truth — change
// the CSS keyframe and the timing updates automatically.
function animSleep(className) {
  return sleep(getAnimDuration(className) + 50);
}

// Perceptual pause between phases so the player can register each one.
// Not tied to a specific animation — just enough for the eye to follow.
var PHASE_GAP_MS = 200;

function getAnimDuration(className) {
  var d = DURATION_CACHE[className]; if (d !== undefined) return d;
  var el = document.createElement('div'); el.className = className; el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px';
  document.body.appendChild(el);
  var ms = 300; try { var raw = getComputedStyle(el).animationDuration; if (raw) { if (raw.indexOf('ms') !== -1) { var v = parseFloat(raw); if (!isNaN(v)) ms = v; } else if (raw.indexOf('s') !== -1) { var v = parseFloat(raw); if (!isNaN(v)) ms = v * 1000; } } } catch(e) {}
  document.body.removeChild(el); DURATION_CACHE[className] = ms; return ms;
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

  fetch('/api/heroes/' + hero.id + '/combat/start', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floor }),
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    combatGen++;
    showingResult = false;
    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = '';
    document.getElementById('combat-log').innerHTML = '';
    prevState = null;

    // Floor announcement
    var announce = document.getElementById('floor-announce');
    if (announce) {
      announce.textContent = 'Floor ' + floor;
      announce.style.opacity = '0';
      announce.style.transition = 'none';
      announce.style.animation = 'none';
      announce.offsetHeight;
      announce.style.transition = 'opacity .8s ease, transform .8s ease';
      announce.style.transform = 'scale(0.5)';
      announce.offsetHeight;
      announce.style.opacity = '1';
      announce.style.transform = 'scale(1)';
      setTimeout(function() {
        announce.style.opacity = '0';
        announce.style.transform = 'scale(1.5)';
        announce.style.transition = 'opacity .6s ease, transform .6s ease';
      }, 1200);
    }

    // Render heroes from the start response
    if (data.heroes && data.heroes.length > 0) {
      renderPartyHeroes(data.heroes);
    }

    // Render monsters from the start response
    if (data.monsters && data.monsters.length > 0) {
      renderMonsters(data.monsters);
      prevMonsterIds = data.monsters.map(function(m) { return m.id; });
    }

    if (combatInterval) { clearTimeout(combatInterval); combatInterval = null; }
    combatInterval = setTimeout(pollCombat, 500);
    return pollCombat();
  })
  .catch(function(err) {
    if (!isLooping) alert(err.message);
  });
}

// ─── Poll Combat ───────────────────────────────────────────
var prevMonsterIds = null;

function pollCombat() {
  return fetch('/api/heroes/' + hero.id + '/combat/status', {
    headers: { 'Authorization': 'Bearer ' + token },
  })
  .then(function(res) { return res.json(); })
  .then(async function(state) {
    if (!state || !state.round) {
      prevState = null;
      return;
    }

    if (state.round) {
      document.getElementById('round-counter').textContent = 'Round ' + state.round.round;
    }

    if (prevState) {
      await animateTransition(prevState, state);

      // Re-render monsters when lineup changes (monster died, new one appears)
      if (state.monsters) {
        if (prevState.monsters) {
          var currMonIds = state.monsters.map(function(m) { return m.id; }).sort().join(',');
          var prevMonIds = prevState.monsters.map(function(m) { return m.id; }).sort().join(',');
          if (currMonIds !== prevMonIds) {
            renderMonsters(state.monsters);
            // Fade in the first monster card as entrance animation
            var firstCard = document.querySelector('.monster-card');
            if (firstCard) { firstCard.classList.add('animate-fade-in'); setTimeout(function() { firstCard.classList.remove('animate-fade-in'); }, 500); }
            // Boss announcement
            var bossCard = document.querySelector('.monster-card.boss');
            if (bossCard && state.monsters.length === 1) {
              var announce = document.getElementById('floor-announce');
              if (announce) {
                announce.textContent = 'BOSS FIGHT';
                announce.style.cssText = 'opacity:0;transform:scale(0.3);transition:none';
                announce.offsetHeight;
                announce.style.transition = 'opacity .6s ease, transform .6s ease';
                announce.style.opacity = '1';
                announce.style.transform = 'scale(1)';
                setTimeout(function() {
                  announce.style.opacity = '0';
                  announce.style.transform = 'scale(1.5)';
                  announce.style.transition = 'opacity .6s ease, transform .6s ease';
                }, 1500);
              }
            }
          } else {
            updateMonsterBars(state.monsters);
          }
        } else {
          renderMonsters(state.monsters);
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
      if (state.round && state.round.partyHeroes) {
        updateHeroBars(state.round.partyHeroes);
      }
      if (state.round) addLog('info', state.round.currentMonsterName + ' appears!');
    }

    // Only set prevState when we have round data
    if (state.round) prevState = state;

    if (state.finished) {
      if (combatInterval) { clearTimeout(combatInterval); combatInterval = null; }
      showResult(state);
      return;
    } else {
      showingResult = false;
      combatInterval = setTimeout(pollCombat, 500);
    }
  })
  .catch(function(err) {
    console.error('Poll failed:', err);
    if (!showingResult) {
      combatInterval = setTimeout(pollCombat, 2000);
    }
  });
}

// ─── Result ────────────────────────────────────────────────
function showResult(state) {
  if (showingResult) return;
  showingResult = true;
  var currentGen = combatGen;
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
    var shardLines = '';
    if (r.shardsEarned) {
      var shardKeys = Object.keys(r.shardsEarned).filter(function(k) { return r.shardsEarned[k] > 0; }).sort();
      for (var si = 0; si < shardKeys.length; si++) {
        var sk = shardKeys[si];
        var parts = sk.split('_');
        var sc = rarityColors[parts[0]] || '#aaa';
        shardLines += '<br /><span style="color:' + sc + ';font-size:.78rem">' + parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + ' Lv.' + (parts[1] || '?') + ' shard ×' + r.shardsEarned[sk] + '</span>';
      }
    }
    details.innerHTML = 'Cleared in ' + (r.totalRounds || roundInfo.round || '?') + ' rounds!' +
      '<br />Monsters defeated: ' + (r.monstersDefeated || 0) + '/' + (r.totalMonsters || '?') +
      '<br />Gold earned: <strong style="color:#fbbf24">' + (r.goldEarned || 0) + '</strong>' +
      shardLines;
  } else {
    details.innerHTML = 'Your party was defeated.<br />';
    if (state.round && state.round.currentMonsterName) {
      details.innerHTML += 'Felled by: ' + state.round.currentMonsterName;
    }
    if (r.goldLost > 0) {
      details.innerHTML += '<br />Gold lost: <strong style="color:#6a2525">-' + r.goldLost + '</strong>';
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

  if (isLooping) {
    // Auto retry on win or loss
    retryBtn.style.display = 'none';
    overlay.classList.add('show');
    setTimeout(function() {
      if (combatGen !== currentGen) return;
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
    toggleLoop();
  }
  document.getElementById('combat-arena').classList.remove('active');
  document.getElementById('start-btn').style.display = '';
  document.getElementById('stop-btn').style.display = 'none';
});

document.getElementById('result-retry-btn').addEventListener('click', function() {
  document.getElementById('result-overlay').classList.remove('show');
  loopRetry();
});

document.getElementById('start-btn').addEventListener('click', enterDungeon);

document.getElementById('stop-btn').addEventListener('click', function() {
  if (combatInterval) { clearTimeout(combatInterval); combatInterval = null; }
  document.getElementById('combat-arena').classList.remove('active');
  document.getElementById('start-btn').style.display = '';
  document.getElementById('stop-btn').style.display = 'none';
  document.getElementById('result-overlay').classList.remove('show');
  if (isLooping) toggleLoop();
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
    combatGen++;
    if (combatInterval) { clearTimeout(combatInterval); combatInterval = null; }
    combatInterval = setTimeout(pollCombat, 500);
    return pollCombat();
  })
  .catch(function(err) {
    if (isLooping) {
      // Don't clear showingResult — if old finished state is polled, showResult is still blocked
      combatInterval = setTimeout(pollCombat, 2000);
    } else {
      alert(err.message);
      isLooping = false;
      updateLoopUI();
    }
  });
}

// ─── Loop Toggle ───────────────────────────────────────────
function toggleLoop() {
  isLooping = !isLooping;
  if (!isLooping) {
    loopCount = 0;
    totalGoldEarned = 0;
    updateLoopUI();
    return;
  }
  updateLoopUI();
  // Auto-enter dungeon if not already in combat
  if (!combatInterval) {
    enterDungeon();
  }
}

function updateLoopUI() {
  var btn = document.getElementById('loop-btn');
  var info = document.getElementById('loop-info');
  if (isLooping) {
    btn.classList.add('active');
    btn.innerHTML = '<i data-lucide="square" style="width:16px;height:16px"></i> STOP';
    if (loopCount > 0) {
      info.classList.add('show');
      info.innerHTML = '<i data-lucide="refresh-cw" style="width:14px;height:14px"></i> Looping | Runs: <strong id="run-count-display">' + loopCount + '</strong> | Gold: <strong id="gold-count-display">' + totalGoldEarned + '</strong>';
    } else {
      info.classList.remove('show');
    }
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

var SLOT_ICONS = {
  rightHandWeapon: 'sword',
  leftHand: 'shield',
  helmet: 'helmet',
  body: 'shirt',
  legs: 'shirt',
  boots: 'shield',
  gloves: 'shield',
  necklace: 'gem',
  leftRing: 'gem',
  rightRing: 'gem',
  leftEarring: 'gem',
  rightEarring: 'gem'
};

// Grid positions for a character-body layout (3-column grid, each entry = [col, row])
var SLOT_POSITIONS = {
  helmet:        [2, 1],
  rightHandWeapon: [1, 2],
  body:          [2, 2],
  leftHand:      [3, 2],
  legs:          [2, 3],
  boots:         [2, 4],
  gloves:        [2, 5],
  necklace:      [1, 6],
  leftEarring:   [2, 6],
  rightEarring:  [3, 6],
  leftRing:      [1, 7],
  rightRing:     [3, 7]
};

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
  renderStatsPanel(hero);
}

function renderStatsPanel(h) {
  var panel = document.getElementById('equip-stats-panel');
  if (!panel) return;
  var s = h.stats || {};
  panel.innerHTML =
    '<div style="font-size:.85rem;font-weight:700;color:#9a949a;margin-bottom:8px">' + escHtml(h.name) + '</div>' +
    '<div class="stat-row"><span class="stat-label">Level</span><span class="stat-value">' + (h.level || 0) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label"><i data-lucide="sword" style="width:12px;height:12px;vertical-align:middle"></i> ATK</span><span class="stat-value atk">' + (s.atk || 0) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label"><i data-lucide="shield" style="width:12px;height:12px;vertical-align:middle"></i> DEF</span><span class="stat-value def">' + (s.def || 0) + '</span></div>' +
    '<div class="stat-row"><span class="stat-label"><i data-lucide="heart" style="width:12px;height:12px;vertical-align:middle"></i> HP</span><span class="stat-value hp">' + (s.hp || 0) + '</span></div>';
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function renderEquipmentSlots(equipped) {
  var grid = document.getElementById('equip-grid');
  grid.innerHTML = '';
  for (var i = 0; i < SLOT_ORDER.length; i++) {
    var slot = SLOT_ORDER[i];
    var slotName = SLOT_NAMES[slot];
    var item = equipped[slot];
    var pos = SLOT_POSITIONS[slot] || [1, 1];
    var div = document.createElement('div');
    div.className = 'equip-slot' + (item ? ' has-item' : '');
    div.dataset.slot = slot;
    div.style.gridColumn = pos[0];
    div.style.gridRow = pos[1];

    if (item) {
      var color = rarityColors[item.rarity] || '#aaa';
      var borderColor = item.rarity === 'legendary' ? '#f59e0b' : item.rarity === 'epic' ? '#a855f7' : item.rarity === 'rare' ? '#3b82f6' : item.rarity === 'uncommon' ? '#22c55e' : '#2a1a3a';
      div.style.borderColor = borderColor;
      div.style.boxShadow = '0 0 8px ' + borderColor + '22';
      var content = document.createElement('div');
      content.className = 'slot-equipped';
      content.innerHTML =
        '<div class="item-icon"><i data-lucide="' + getItemEmoji(slot, item.type) + '" style="width:20px;height:20px;color:' + color + '"></i></div>' +
        '<div class="item-name" style="color:' + color + '">' + escHtml(item.name) + '</div>' +
        '<div class="item-stat" style="color:' + color + '">' + getMainStat(item) + '</div>' +
        '<div class="item-level">Lv.' + item.level + '</div>';
      div.appendChild(content);

      var label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = slotName;
      div.appendChild(label);

      var unequipBtn = document.createElement('button');
      unequipBtn.className = 'unequip-btn';
      unequipBtn.textContent = '×';
      unequipBtn.title = 'Unequip ' + slotName;
      unequipBtn.addEventListener('click', (function(s) { return function() { unequipItem(s); }; })(slot));
      div.appendChild(unequipBtn);
    } else {
      var label = document.createElement('div');
      label.className = 'slot-label';
      label.textContent = slotName;
      div.appendChild(label);
      var empty = document.createElement('div');
      empty.className = 'slot-empty';
      empty.textContent = slotName === 'Ring' || slotName === 'Earring' ? '(empty)' : '(empty)';
      div.appendChild(empty);
    }

    grid.appendChild(div);
  }
}

function renderInventory(inventory) {
  var container = document.getElementById('equip-inventory');
  var countEl = document.getElementById('inv-count');
  container.innerHTML = '';
  countEl.textContent = '(' + inventory.length + ' items)';

  if (inventory.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:24px;color:#3a373a;font-size:.85rem">No items in inventory.</div>';
    return;
  }

  for (var i = 0; i < inventory.length; i++) {
    var item = inventory[i];
    var color = rarityColors[item.rarity] || '#aaa';
    var card = document.createElement('div');
    card.className = 'inv-item';

    var icon = document.createElement('div');
    icon.className = 'inv-icon';
    icon.innerHTML = '<i data-lucide="' + getItemEmoji(item.slot, item.type) + '" style="width:20px;height:20px;color:' + color + '"></i>';
    card.appendChild(icon);

    var info = document.createElement('div');
    info.className = 'inv-info';
    info.innerHTML =
      '<div class="inv-name" style="color:' + color + '">' + escHtml(item.name) + '</div>' +
      '<div class="inv-stats">' + escHtml(SLOT_NAMES[item.slot] || item.slot) + ' \\u00B7 ' + getMainStat(item) + ' \\u00B7 Lv.' + item.level + ' \\u00B7 ' + item.rarity.toUpperCase() + '</div>';
    card.appendChild(info);

    var equipBtn = document.createElement('button');
    equipBtn.className = 'equip-btn';
    equipBtn.textContent = 'Equip';
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
  loadInvites();
}

function showPartyInParty(party) {
  document.getElementById('party-not-in').style.display = 'none';
  document.getElementById('party-in').style.display = 'block';
  document.getElementById('party-title').textContent = party.name;
  document.getElementById('party-info').innerHTML = 'Members: ' + party.memberCount + '/' + party.maxSize + ' \\u00B7 Floor ' + party.currentFloor + '<br /><span style="font-size:.72rem;color:#3a373a">ID: ' + party.id + '</span>';

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

// ─── Crafting ───────────────────────────────────────────────
var CRAFTABLE_SLOTS = {
  rightHandWeapon: ['melee','range','mage'],
  leftHand: ['melee','range','mage'],
  helmet: ['universal'], body: ['universal'], legs: ['universal'],
  boots: ['universal'], gloves: ['universal'],
  necklace: ['universal'], leftRing: ['universal'], rightRing: ['universal'],
  leftEarring: ['universal'], rightEarring: ['universal']
};

function loadCrafting() {
  fetch('/api/heroes/' + hero.id, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(h) {
    hero.gold = h.gold;
    hero.stats = h.stats;
    hero.level = h.level;
    renderCraftShards(h.shards || {});
    renderConvertShards(h.shards || {});
    renderSalvageItems(h.inventory || []);
    populateCraftSlots();
    updateCraftCost();
  })
  .catch(function(err) { console.error('Crafting load failed:', err); });
}

function renderCraftShards(shards) {
  var container = document.getElementById('craft-shard-list');
  container.innerHTML = '';
  var keys = Object.keys(shards).filter(function(k) { return shards[k] > 0; }).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:16px;color:#3a373a;font-size:.78rem">No shards yet — kill monsters to earn them.</div>';
    return;
  }
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var parts = k.split('_');
    var rarity = parts[0];
    var bracket = parts[1] || '?';
    var color = rarityColors[rarity] || '#aaa';
    var div = document.createElement('div');
    div.className = 'craft-shard-entry';
    div.innerHTML =
      '<span class="shard-label" style="color:' + color + '">' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' Lv.' + bracket + '</span>' +
      '<span class="shard-count">' + shards[k] + 'x</span>';
    container.appendChild(div);
  }
}

function renderConvertShards(shards) {
  var container = document.getElementById('craft-convert-list');
  container.innerHTML = '';
  var keys = Object.keys(shards).filter(function(k) { return shards[k] > 0; }).sort();
  if (keys.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:16px;color:#3a373a;font-size:.78rem">No shards to convert.</div>';
    return;
  }
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var parts = k.split('_');
    var rarity = parts[0];
    var bracket = parseInt(parts[1]) || 10;
    var color = rarityColors[rarity] || '#aaa';
    var goldVal = bracket * ({common:2,uncommon:5,rare:12,epic:30,legendary:80}[rarity] || 1) * 1.75;
    var div = document.createElement('div');
    div.className = 'craft-shard-entry';
    div.innerHTML =
      '<span class="shard-label" style="color:' + color + '">' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' Lv.' + bracket + '</span>' +
      '<span style="color:#5a555a;font-size:.72rem">' + shards[k] + 'x → ' + Math.round(goldVal) + 'g</span>' +
      '<button class="shard-btn" data-key="' + k + '">Convert 1</button>';
    container.appendChild(div);
    div.querySelector('.shard-btn').addEventListener('click', (function(key, r, b) {
      return function() { convertShard(key, r, b); };
    })(k, rarity, bracket));
  }
}

function convertShard(key, rarity, bracket) {
  fetch('/api/heroes/' + hero.id + '/shop/salvage-shard', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ rarity: rarity, bracketLevel: bracket, amount: 1 })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadCrafting(); refreshHero(); })
  .catch(function(err) { alert(err.message); });
}

function renderSalvageItems(inventory) {
  var container = document.getElementById('craft-salvage-list');
  container.innerHTML = '';
  if (!inventory || inventory.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:16px;color:#3a373a;font-size:.78rem">No items to salvage.</div>';
    return;
  }
  for (var i = 0; i < inventory.length; i++) {
    var item = inventory[i];
    var color = rarityColors[item.rarity] || '#aaa';
    var div = document.createElement('div');
    div.className = 'craft-salvage-entry';
    div.innerHTML =
      '<div class="salvage-info"><div class="salvage-name" style="color:' + color + '">' + escHtml(item.name || 'Unnamed') + '</div>' +
      '<div class="salvage-stats">' + (SLOT_NAMES[item.slot] || item.slot) + ' · Lv.' + item.level + ' · ' + item.rarity.toUpperCase() + '</div></div>' +
      '<button class="salvage-btn" data-id="' + item.id + '">Salvage</button>';
    container.appendChild(div);
    div.querySelector('.salvage-btn').addEventListener('click', (function(id) {
      return function() { salvageItemCraft(id); };
    })(item.id));
  }
}

function salvageItemCraft(itemId) {
  fetch('/api/heroes/' + hero.id + '/shop/salvage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ equipmentId: itemId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadCrafting(); refreshHero(); })
  .catch(function(err) { alert(err.message); });
}

function populateCraftSlots() {
  var sel = document.getElementById('craft-slot');
  sel.innerHTML = '<option value="">—</option>';
  for (var slot in CRAFTABLE_SLOTS) {
    var opt = document.createElement('option');
    opt.value = slot;
    opt.textContent = SLOT_NAMES[slot] || slot;
    sel.appendChild(opt);
  }
}

document.getElementById('craft-slot').addEventListener('change', function() {
  populateCraftTypes();
  updateCraftCost();
});

document.getElementById('craft-type').addEventListener('change', updateCraftCost);
document.getElementById('craft-rarity').addEventListener('change', updateCraftCost);

function populateCraftTypes() {
  var slot = document.getElementById('craft-slot').value;
  var sel = document.getElementById('craft-type');
  sel.innerHTML = '<option value="">—</option>';
  var types = CRAFTABLE_SLOTS[slot];
  if (!types) return;
  for (var i = 0; i < types.length; i++) {
    var opt = document.createElement('option');
    opt.value = types[i];
    opt.textContent = types[i].charAt(0).toUpperCase() + types[i].slice(1);
    sel.appendChild(opt);
  }
}

function updateCraftCost() {
  var rarity = document.getElementById('craft-rarity').value;
  var mult = { common: 2, uncommon: 5, rare: 12, epic: 30, legendary: 80 }[rarity] || 1;
  var bracket = Math.ceil(hero.currentFloor / 10) * 10 || 10;
  var goldCost = bracket * mult * 7;
  document.getElementById('craft-cost-display').textContent = 'Cost: 1 ' + rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' shard · ' + goldCost + ' gold';
}

document.getElementById('craft-btn').addEventListener('click', function() {
  var slot = document.getElementById('craft-slot').value;
  var type = document.getElementById('craft-type').value;
  var rarity = document.getElementById('craft-rarity').value;
  var result = document.getElementById('craft-result');

  if (!slot || !type) { result.className = 'craft-result error'; result.textContent = 'Select a slot and type.'; return; }

  result.className = 'craft-result';
  result.textContent = 'Crafting...';

  fetch('/api/heroes/' + hero.id + '/shop/craft', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ slot: slot, type: type, rarity: rarity })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    result.className = 'craft-result success';
    result.innerHTML = 'Crafted! <span style="color:' + (rarityColors[rarity] || '#aaa') + '">' + (data.equipment.name || rarity.charAt(0).toUpperCase() + rarity.slice(1) + ' ' + (SLOT_NAMES[slot] || slot)) + '</span>';
    loadCrafting();
    refreshHero();
  })
  .catch(function(err) {
    result.className = 'craft-result error';
    result.textContent = err.message;
  });
});

// ─── Log Toggle ─────────────────────────────────────────────
document.getElementById('log-toggle').addEventListener('click', function() {
  var log = document.getElementById('combat-log');
  var btn = document.getElementById('log-toggle');
  if (log.style.display === 'none') {
    log.style.display = '';
    btn.textContent = 'Hide log';
  } else {
    log.style.display = 'none';
    btn.textContent = 'Show log';
  }
});

// ─── Shake Toggle ───────────────────────────────────────────
document.getElementById('shake-toggle').addEventListener('click', function() {
  document.body.classList.toggle('no-shake');
  this.textContent = document.body.classList.contains('no-shake') ? 'Shake:OFF' : 'Shake:ON';
});

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
