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
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: #0a0a14;
      color: #e0e0e0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* ── Screens ───────────────────────────────────────── */
    .screen {
      display: none;
      width: 100%;
      max-width: 960px;
      padding: 24px;
      animation: fadeIn 0.3s ease;
    }
    .screen.active { display: block; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Cards ─────────────────────────────────────────── */
    .card {
      background: #12122a;
      border: 1px solid #1a1a3e;
      border-radius: 12px;
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .card-centered {
      max-width: 400px;
      margin: 0 auto;
      text-align: center;
    }

    h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    h1 .gold   { color: #fbbf24; }
    h1 .purple { color: #7c3aed; }
    .subtitle {
      color: #8888aa;
      margin-bottom: 28px;
      font-size: 0.9rem;
    }

    /* ── Form ──────────────────────────────────────────── */
    .form-group {
      margin-bottom: 16px;
      text-align: left;
    }
    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: #a0a0c0;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 6px;
    }
    .form-group input {
      width: 100%;
      padding: 12px 14px;
      background: #0d0d1f;
      border: 1px solid #1a1a3e;
      border-radius: 8px;
      color: #e0e0e0;
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-group input:focus {
      border-color: #7c3aed;
      box-shadow: 0 0 0 3px rgba(124,58,237,0.25);
    }
    .form-group input::placeholder {
      color: #555577;
    }

    /* ── Buttons ───────────────────────────────────────── */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      width: 100%;
    }
    .btn:active { transform: scale(0.97); }

    .btn-primary {
      background: #7c3aed;
      color: #fff;
    }
    .btn-primary:hover {
      background: #6d28d9;
      box-shadow: 0 4px 20px rgba(124,58,237,0.35);
    }

    .btn-gold {
      background: #fbbf24;
      color: #0a0a14;
    }
    .btn-gold:hover {
      background: #f59e0b;
      box-shadow: 0 4px 20px rgba(251,191,36,0.35);
    }

    .btn-danger {
      background: transparent;
      color: #ef4444;
      border: 1px solid #ef4444;
    }
    .btn-danger:hover {
      background: #ef4444;
      color: #fff;
    }

    .btn-ghost {
      background: transparent;
      color: #8888aa;
      border: 1px solid #1a1a3e;
      width: auto;
      padding: 8px 16px;
    }
    .btn-ghost:hover {
      background: #1a1a3e;
      color: #e0e0e0;
    }

    .btn-sm {
      padding: 6px 14px;
      font-size: 0.8rem;
      width: auto;
    }

    .btn-group {
      display: flex;
      gap: 10px;
      margin-top: 20px;
    }
    .btn-group .btn { flex: 1; }

    /* ── Alerts ────────────────────────────────────────── */
    .alert {
      padding: 10px 14px;
      border-radius: 8px;
      font-size: 0.85rem;
      margin-bottom: 16px;
      display: none;
    }
    .alert.show { display: block; }
    .alert-error {
      background: rgba(239,68,68,0.12);
      border: 1px solid rgba(239,68,68,0.3);
      color: #f87171;
    }
    .alert-success {
      background: rgba(34,197,94,0.12);
      border: 1px solid rgba(34,197,94,0.3);
      color: #4ade80;
    }

    /* ── Hero Select Layout ────────────────────────────── */
    .hero-layout {
      display: grid;
      grid-template-columns: 1fr 320px;
      gap: 24px;
    }

    .hero-list-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .hero-list-header h2 {
      font-size: 1.3rem;
      font-weight: 700;
    }

    .hero-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: #0d0d1f;
      border: 1px solid #1a1a3e;
      border-radius: 10px;
      margin-bottom: 10px;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .hero-row:hover {
      border-color: #7c3aed;
      box-shadow: 0 0 0 1px rgba(124,58,237,0.15);
    }

    .hero-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .hero-name {
      font-weight: 700;
      font-size: 1.05rem;
      color: #e0e0e0;
    }
    .hero-meta {
      display: flex;
      gap: 12px;
      font-size: 0.8rem;
      color: #8888aa;
    }
    .hero-meta span { display: flex; align-items: center; gap: 4px; }
    .hero-meta .stat-atk { color: #fbbf24; }
    .hero-meta .stat-def { color: #7c3aed; }
    .hero-meta .stat-hp  { color: #22c55e; }

    .hero-actions {
      display: flex;
      gap: 8px;
    }

    .empty-heroes {
      text-align: center;
      padding: 48px 0;
      color: #555577;
    }
    .empty-heroes p { font-size: 0.95rem; }

    /* ── Create Hero ───────────────────────────────────── */
    .create-hero-card h3 {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .loading {
      text-align: center;
      padding: 40px 0;
      color: #555577;
    }
    .loading::after {
      content: "";
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid #1a1a3e;
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-top: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Responsive ────────────────────────────────────── */
    @media (max-width: 768px) {
      .hero-layout {
        grid-template-columns: 1fr;
      }
      .card { padding: 20px; }
    }
  </style>
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
                  '<span class="stat-hp">❤ ' + (st.hp ?? 0) + '</span>' +
                  '<span class="stat-atk">⚔ ' + (st.atk ?? 0) + '</span>' +
                  '<span class="stat-def">🛡 ' + (st.def ?? 0) + '</span>' +
                '</div>' +
              '</div>' +
              '<div class="hero-actions">' +
                '<a href="/game/' + h.id + '" class="btn btn-primary btn-sm">Play</a>' +
                '<button class="btn btn-danger btn-sm" data-hero-id="' + h.id + '" data-hero-name="' + escAttr(h.name) + '">Delete</button>' +
              '</div>' +
            '</div>';
          }).join('');

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
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0a0a14;color:#e0e0e0;min-height:100vh}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:10px 20px;border:none;border-radius:8px;font-size:0.9rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
.btn:active{transform:scale(.97)}
.btn-primary{background:#7c3aed;color:#fff}
.btn-primary:hover{background:#6d28d9;box-shadow:0 4px 20px rgba(124,58,237,.35)}
.btn-primary:disabled{opacity:.5;cursor:not-allowed}
.btn-ghost{background:transparent;color:#8888aa;border:1px solid #1a1a3e}
.btn-ghost:hover{background:#1a1a3e;color:#e0e0e0}
.btn-loop{background:transparent;color:#22c55e;border:1px solid #22c55e}
.btn-loop.active{background:#22c55e;color:#0a0a14}
.btn-sm{padding:6px 14px;font-size:.8rem}
.btn-group{display:flex;gap:10px}
.btn-group .btn{flex:1}

/* ── Hero Bar ── */
.hero-bar{position:sticky;top:0;z-index:100;background:#12122a;border-bottom:1px solid #1a1a3e;padding:10px 20px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.hero-bar .h-name{font-size:1.15rem;font-weight:700;color:#fbbf24}
.hero-bar .h-stat{font-size:.8rem;color:#a0a0c0;display:flex;align-items:center;gap:4px}
.hero-bar .h-stat .h-val{color:#e0e0e0;font-weight:600}
.hp-bar-outer{width:100px;height:8px;background:#1a1a3e;border-radius:4px;overflow:hidden}
.hp-bar-inner{height:100%;border-radius:4px;transition:width .4s ease}
.hp-green{background:#22c55e}
.hp-yellow{background:#eab308}
.hp-red{background:#ef4444}

/* ── Tabs ── */
.tab-bar{display:flex;border-bottom:1px solid #1a1a3e;background:#0d0d1f}
.tab{padding:12px 24px;border:none;background:transparent;color:#8888aa;font-size:.9rem;font-weight:600;cursor:pointer;transition:all .2s;border-bottom:2px solid transparent}
.tab:hover{color:#e0e0e0;background:rgba(124,58,237,.05)}
.tab.active{color:#7c3aed;border-bottom-color:#7c3aed}
.tab-content{display:none;padding:20px;max-width:960px;margin:0 auto}
.tab-content.active{display:block}

/* ── Dungeon Setup ── */
.dungeon-setup{text-align:center;padding:20px}
.floor-selector{margin-bottom:16px}
.floor-selector select{padding:8px 14px;background:#0d0d1f;border:1px solid #1a1a3e;border-radius:8px;color:#e0e0e0;font-size:.95rem;outline:none}
.floor-selector select:focus{border-color:#7c3aed}
.monster-preview{background:#0d0d1f;border:1px solid #1a1a3e;border-radius:10px;padding:20px;margin-bottom:16px;color:#8888aa;font-size:.9rem}
.monster-preview strong{color:#e0e0e0}

/* ── Combat Arena ── */
#combat-arena{display:none}
#combat-arena.active{display:block}
.round-counter{text-align:center;font-size:1.1rem;font-weight:700;margin-bottom:12px;color:#fbbf24}
.arena{display:grid;grid-template-rows:auto auto auto;gap:12px;padding:16px;background:#0d0d1f;border:1px solid #1a1a3e;border-radius:12px;min-height:320px;position:relative}
.arena-row{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;align-items:center}
.monster-card,.hero-card{background:#12122a;border:1px solid #1a1a3e;border-radius:10px;padding:10px 14px;text-align:center;min-width:110px;position:relative;transition:transform .2s,box-shadow .2s}
.monster-card.boss{min-width:180px;padding:16px 24px;border-color:#fbbf24}
.monster-card.boss .monster-icon{font-size:2.5rem}
.monster-card.is-focus{border-color:#a855f7;box-shadow:0 0 15px rgba(168,85,247,.3)}
.monster-icon{font-size:1.8rem;margin-bottom:4px}
.monster-name,.hero-card-name{font-size:.8rem;font-weight:600;color:#e0e0e0;margin-bottom:4px}
.monster-hp,.hero-hp{font-size:.75rem;color:#8888aa;margin-top:2px}
.hero-role-icon{font-size:1.3rem;margin-bottom:2px}

/* ── Combat Log ── */
.combat-log{max-height:180px;overflow-y:auto;background:#0d0d1f;border:1px solid #1a1a3e;border-radius:8px;padding:10px;margin-top:12px;font-size:.78rem;line-height:1.5}
.log-entry{padding:1px 0;border-bottom:1px solid rgba(26,26,62,.5)}
.log-entry:last-child{border-bottom:none}
.log-entry.damage{color:#ef4444}
.log-entry.heal{color:#22c55e}
.log-entry.crit{color:#fbbf24;font-weight:600}
.log-entry.info{color:#8888aa}
.log-entry.kill{color:#a855f7;font-weight:600}
.log-entry.block{color:#3b82f6}

/* ── Particle / Floating Text ── */
.float-text{position:fixed;pointer-events:none;z-index:600;font-weight:700;font-size:1rem;animation:floatUp .8s ease-out forwards}
.float-text.heal{color:#22c55e}
.float-text.crit{color:#fbbf24}
.float-text.block{color:#3b82f6}
@keyframes floatUp{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-40px)}}

.projectile{position:fixed;pointer-events:none;z-index:500;border-radius:50%;width:12px;height:12px}
.projectile-trail{position:fixed;pointer-events:none;z-index:499;border-radius:50%}

/* ── Overlay ── */
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);display:none;align-items:center;justify-content:center;z-index:1000;animation:fadeIn .3s ease}
.overlay.show{display:flex}
.overlay-card{background:#12122a;border:1px solid #1a1a3e;border-radius:12px;padding:32px;text-align:center;max-width:380px;width:90%}
.overlay-card h2{font-size:1.6rem;margin-bottom:8px}
.overlay-card .victory{color:#22c55e}
.overlay-card .defeat{color:#ef4444}
.overlay-card p{color:#a0a0c0;margin-bottom:8px;font-size:.9rem}
.overlay-card .big-num{font-size:2rem;font-weight:800;color:#fbbf24;margin:8px 0}

/* ── Loop Info ── */
.loop-info{text-align:center;padding:8px;background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);border-radius:8px;margin-top:12px;display:none;font-size:.85rem;color:#4ade80}
.loop-info.show{display:block}

/* ── Animations ── */
.animate-lunge{animation:lunge .45s ease}
@keyframes lunge{0%{transform:translateX(0)}35%{transform:translateX(45px)}55%{transform:translateX(45px)}100%{transform:translateX(0)}}
.animate-flash-white{animation:flashWhite .35s ease}
@keyframes flashWhite{0%,100%{box-shadow:0 0 0 transparent}50%{box-shadow:0 0 30px rgba(255,255,255,.8),0 0 60px rgba(255,255,255,.3)}}
.animate-flash-red{animation:flashRed .4s ease}
@keyframes flashRed{0%,100%{background-color:transparent}25%{background-color:rgba(239,68,68,.25)}}
.animate-pulse-green{animation:pulseGreen .5s ease}
@keyframes pulseGreen{0%,100%{box-shadow:0 0 0 transparent}50%{box-shadow:0 0 20px rgba(34,197,94,.6)}}
.animate-shake{animation:shake .3s ease}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-4px)}40%{transform:translateX(4px)}60%{transform:translateX(-2px)}80%{transform:translateX(2px)}}
.animate-fade-out{animation:fadeOut .6s ease forwards}
@keyframes fadeOut{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}
.animate-shield{animation:shieldGlow .5s ease}
@keyframes shieldGlow{0%,100%{box-shadow:0 0 0 transparent}50%{box-shadow:0 0 25px rgba(59,130,246,.8),inset 0 0 15px rgba(59,130,246,.2)}}
.animate-explode{animation:explode .4s ease forwards}
@keyframes explode{0%{transform:scale(1);opacity:1}100%{transform:scale(3);opacity:0}}
@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}

/* ── Party ── */
#party-in{display:none}
#party-in.active{display:block}
#party-not-in{display:none}
#party-not-in.active{display:block}
.member-card{background:#12122a;border:1px solid #2a2a44;border-radius:8px;padding:10px;margin:6px 0}
.member-card .role-badge{padding:2px 8px;border-radius:4px;font-size:11px;font-weight:bold;display:inline-block}
.role-tank{color:#f97316;border:1px solid #f97316}
.role-dps{color:#ef4444;border:1px solid #ef4444}
.role-healer{color:#22c55e;border:1px solid #22c55e}
.party-section{margin-bottom:16px}
.party-section h2{font-size:1.15rem;font-weight:700;margin-bottom:8px;color:#e0e0e0}
.party-section h3{font-size:.95rem;font-weight:600;margin-bottom:6px;color:#a0a0c0}
.party-input{width:auto;padding:8px 12px;background:#0d0d1f;border:1px solid #1a1a3e;border-radius:6px;color:#e0e0e0;font-size:.85rem;outline:none;margin-right:6px}
.party-input:focus{border-color:#7c3aed}
.party-controls{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0}
.party-title{font-size:1.3rem;font-weight:700;color:#fbbf24;margin-bottom:2px}
.party-info{color:#8888aa;font-size:.85rem;margin-bottom:12px}

/* ── Responsive ── */
@media(max-width:600px){
  .hero-bar{gap:8px;padding:8px 12px;font-size:.8rem}
  .hero-bar .h-name{font-size:1rem}
  .tab{padding:10px 14px;font-size:.8rem}
  .tab-content{padding:12px}
  .monster-card{min-width:80px;padding:8px}
  .monster-card.boss{min-width:140px}
  .arena{padding:10px;gap:8px}
}

/* ── Equipment ── */
.equip-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0}
.equip-slot{background:#1a1a30;border:1px solid #2a2a44;border-radius:8px;padding:10px;min-height:60px}
.equip-slot .slot-label{font-size:11px;font-weight:600;color:#666688;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.equip-slot .slot-empty{color:#555577;font-size:.82rem;font-style:italic}
.equip-slot .slot-equipped{display:flex;flex-direction:column;gap:2px}
.equip-slot .slot-equipped .item-icon{font-size:1.4rem}
.equip-slot .slot-equipped .item-name{font-size:.85rem;font-weight:600}
.equip-slot .slot-equipped .item-stat{font-size:.78rem}
.equip-slot .slot-equipped .item-level{font-size:.72rem;color:#8888aa}
.inv-item{background:#1e1e38;border:1px solid #2e2e48;border-radius:6px;padding:8px;margin:4px 0;display:flex;align-items:center;gap:10px}
.inv-item .inv-icon{font-size:1.6rem;min-width:32px;text-align:center}
.inv-item .inv-info{flex:1}
.inv-item .inv-name{font-size:.85rem;font-weight:600}
.inv-item .inv-stats{font-size:.78rem;color:#8888aa}
.equip-section-title{font-size:1.05rem;font-weight:700;margin:16px 0 8px}
.inv-count{font-size:.8rem;color:#8888aa;font-weight:400}
</style>
</head>
<body>

<script id="hero-data" type="application/json">${heroJson}</script>

<!-- ═══════════ HERO BAR ═══════════ -->
<div class="hero-bar" id="hero-bar">
  <span class="h-name" id="hero-bar-name">${safeName}</span>
  <span class="h-stat">Lv.<span class="h-val" id="hero-bar-level">${hero.level}</span></span>
  <span class="h-stat">\u2694\uFE0F <span class="h-val" id="hero-bar-atk">${hero.stats.atk}</span></span>
  <span class="h-stat">\uD83D\uDEE1\uFE0F <span class="h-val" id="hero-bar-def">${hero.stats.def}</span></span>
  <span class="h-stat">
    \u2764\uFE0F <span class="hp-bar-outer"><span class="hp-bar-inner hp-green" id="hero-bar-hp-fill" style="width:100%"></span></span>
    <span id="hero-bar-hp">${hero.stats.hp}</span>/<span id="hero-bar-maxhp">${hero.stats.hp}</span>
  </span>
  <span class="h-stat">\uD83D\uDCB0 <span class="h-val" id="hero-bar-gold">${hero.gold}</span></span>
</div>

<!-- ═══════════ TABS ═══════════ -->
<div class="tab-bar">
  <button class="tab active" data-tab="dungeon">\u2694\uFE0F Dungeon</button>
  <button class="tab" data-tab="equipment">\uD83D\uDEE1\uFE0F Equipment</button>
  <button class="tab" data-tab="party">\uD83D\uDC65 Party</button>
</div>

<!-- ═══════════ TAB: DUNGEON ═══════════ -->
<div id="tab-dungeon" class="tab-content active">

  <div id="dungeon-setup" class="dungeon-setup">
    <div class="floor-selector">
      <label for="floor-select" style="color:#a0a0c0;font-weight:600;font-size:.85rem;margin-right:8px">FLOOR</label>
      <select id="floor-select"></select>
    </div>

    <div id="monster-preview" class="monster-preview">
      Select a floor and enter the dungeon to begin your adventure!
    </div>

    <div class="btn-group" style="justify-content:center;max-width:400px;margin:0 auto">
      <button id="enter-btn" class="btn btn-primary">\u2694\uFE0F Enter Dungeon</button>
      <button id="loop-btn" class="btn btn-loop">\uD83D\uDD04 LOOP</button>
    </div>
  </div>

  <div id="combat-arena">
    <div class="round-counter" id="round-counter">Round 0</div>

    <div class="arena">
      <div class="arena-row" id="boss-row"></div>
      <div class="arena-row" id="monster-row"></div>
      <div id="arena-divider" style="border-top:1px solid #1a1a3e;margin:4px 0"></div>
      <div class="arena-row" id="hero-row"></div>
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
      <div style="font-size:.85rem;color:#fbbf24">\uD83D\uDD04 Loop Run #<span id="loop-run-count">0</span></div>
      <div class="big-num" id="loop-total-gold">0</div>
      <div style="font-size:.8rem;color:#a0a0c0">total gold earned</div>
    </div>
    <div class="btn-group" style="margin-top:16px;justify-content:center">
      <button id="result-btn" class="btn btn-primary">OK</button>
      <button id="result-retry-btn" class="btn btn-ghost" style="display:none">\u2694\uFE0F Retry</button>
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
      (isBoss ? '<span style="color:#fbbf24;font-weight:600">\\uD83D\\uDC7A BRACKET BOSS FLOOR</span>' : 'Difficulty scales with floor level.') +
      '<br /><span style="color:#8888aa;font-size:.8rem">' + (isBoss ? 'A powerful boss awaits!' : 'Defeat all monsters to face the floor boss.') + '</span>';
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
  el.textContent = text;
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
    var icon = m.isBoss ? '\\uD83D\\uDC79' : '\\uD83D\\uDC7E';
    card.innerHTML = '<div class="monster-icon">' + icon + '</div>' +
      '<div class="monster-name">' + escHtml(m.name) + '</div>' +
      '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner ' + hpColorClass(m.hp, m.maxHp) + '" style="width:' + pct + '%"></div></div>' +
      '<div class="monster-hp">' + m.hp + '/' + m.maxHp + '</div>';
    if (m.isBoss) bossRow.appendChild(card);
    else monsterRow.appendChild(card);
  });
}

// ─── Render Party Heroes ───────────────────────────────────
function renderPartyHeroes(partyHeroes) {
  var row = document.getElementById('hero-row');
  row.innerHTML = '';
  var icons = { tank: '\\uD83D\\uDEE1\\uFE0F', dps: '\\u2694\\uFE0F', healer: '\\uD83D\\uDC9A' };
  partyHeroes.forEach(function(h) {
    var card = document.createElement('div');
    card.className = 'hero-card';
    card.id = 'hero-' + h.heroId;
    var pct = h.maxHp > 0 ? (h.hp / h.maxHp) * 100 : 0;
    card.innerHTML = '<div class="hero-role-icon">' + (icons[h.role] || '\\u2694\\uFE0F') + '</div>' +
      '<div class="hero-card-name">[' + h.role.toUpperCase() + ']</div>' +
      '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner ' + hpColorClass(h.hp, h.maxHp) + '" style="width:' + pct + '%"></div></div>' +
      '<div class="hero-hp">' + h.hp + '/' + h.maxHp + '</div>';
    row.appendChild(card);
  });
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

// ─── Animate Transition ────────────────────────────────────
function animateTransition(prev, next) {
  if (!next.round || !prev.round) return;
  if (next.round.round <= prev.round.round) return; // skip duplicate

  var round = next.round;
  var prevRound = prev.round;

  // Party hero state changes
  if (round.partyHeroes && prevRound.partyHeroes) {
    round.partyHeroes.forEach(function(h) {
      var prevH = null;
      for (var i = 0; i < prevRound.partyHeroes.length; i++) {
        if (prevRound.partyHeroes[i].heroId === h.heroId) { prevH = prevRound.partyHeroes[i]; break; }
      }
      if (!prevH) return;

      // Hero attacked
      if (h.damage > 0) {
        var wType = (h.heroId === hero.id) ? getWeaponType() : 'melee';
        playAttackAnimation(wType, h.heroId);
        var roleLabel = h.role.charAt(0).toUpperCase() + h.role.slice(1);
        if (h.crit) addLog('crit', '[R' + round.round + '] ' + roleLabel + ' CRITS for ' + h.damage + '!');
        else addLog('damage', '[R' + round.round + '] ' + roleLabel + ' hits for ' + h.damage);
      }

      // Hero healed
      if (h.healingReceived > 0) {
        playHealAnimation(h.heroId, h.healingReceived);
        addLog('heal', '[R' + round.round + '] +' + h.healingReceived + ' HP healed');
      }

      // Hero took damage
      if (h.damageTaken > 0) {
        playHitAnimation(h.heroId, h.damageTaken);
        if (h.role === 'tank') {
          playBlockAnimation(h.heroId, h.damageTaken);
          addLog('block', '[R' + round.round + '] Tank blocks ' + h.damageTaken + ' damage!');
        } else {
          addLog('damage', '[R' + round.round + '] ' + (h.role.charAt(0).toUpperCase() + h.role.slice(1)) + ' takes ' + h.damageTaken + (h.monsterCrit ? ' (CRIT!)' : ''));
        }
      }

      // Hero died
      if (!h.alive && prevH.alive) {
        playDeathAnimation('hero-' + h.heroId);
        addLog('kill', '[R' + round.round + '] ' + (h.role.charAt(0).toUpperCase() + h.role.slice(1)) + ' has fallen!');
      }
    });
  }

  // Monster killed
  if (round.monsterJustKilled && !prevRound.monsterJustKilled) {
    playMonsterDeathAnimation();
    addLog('kill', '[R' + round.round + '] ' + prevRound.currentMonsterName + ' defeated!');
  }

  // Monster transition to next monster
  if (round.monsterJustKilled && round.currentMonsterName !== prevRound.currentMonsterName) {
    setTimeout(function() {
      addLog('info', 'Next: ' + round.currentMonsterName + ' appears!');
    }, 600);
  }

  // Update HP bars
  if (next.monsters) updateMonsterBars(next.monsters);
  if (round.partyHeroes) updateHeroBars(round.partyHeroes);
}

// ─── Attack Animation ──────────────────────────────────────
function playAttackAnimation(weaponType, heroId) {
  var heroEl = document.getElementById('hero-' + heroId);
  var monsterEl = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
  if (!heroEl || !monsterEl) return;

  if (weaponType === 'melee') {
    heroEl.classList.add('animate-lunge');
    setTimeout(function() {
      monsterEl.classList.add('animate-flash-white');
      var hr = monsterEl.getBoundingClientRect();
      floatText(hr.left + hr.width/2 - 20, hr.top - 10, 'HIT!', 'crit');
      setTimeout(function() {
        monsterEl.classList.remove('animate-flash-white');
        heroEl.classList.remove('animate-lunge');
      }, 400);
    }, 220);
  } else if (weaponType === 'mage') {
    var colors = { fire: '#ff8800', ice: '#4488ff', arcane: '#aa44ff' };
    var color = colors.fire;
    if (hero.equipped.rightHandWeapon && hero.equipped.rightHandWeapon.name) {
      var n = hero.equipped.rightHandWeapon.name.toLowerCase();
      if (n.indexOf('ice') !== -1 || n.indexOf('frost') !== -1) color = colors.ice;
      else if (n.indexOf('arcane') !== -1 || n.indexOf('void') !== -1) color = colors.arcane;
    }
    createProjectile(heroEl, monsterEl, color, false);
    setTimeout(function() {
      createExplosion(monsterEl, color);
    }, 400);
  } else {
    // Range: arc arrow
    createProjectile(heroEl, monsterEl, '#88ccff', true);
    setTimeout(function() {
      monsterEl.classList.add('animate-flash-white');
      var hr = monsterEl.getBoundingClientRect();
      floatText(hr.left + hr.width/2 - 20, hr.top - 10, 'HIT!', 'damage');
      setTimeout(function() { monsterEl.classList.remove('animate-flash-white'); }, 400);
    }, 450);
  }
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
    setTimeout(function() { spark.remove(); }, 400);
  }
  el.classList.add('animate-flash-white');
  var rect2 = el.getBoundingClientRect();
  floatText(rect2.left + rect2.width/2 - 20, rect2.top - 15, 'BOOM!', 'crit');
  setTimeout(function() { el.classList.remove('animate-flash-white'); }, 400);
}

// ─── Hit / Heal / Block / Death ────────────────────────────
function playHitAnimation(heroId, damage) {
  var el = document.getElementById('hero-' + heroId);
  if (!el) return;
  el.classList.add('animate-flash-red');
  el.classList.add('animate-shake');
  var rect = el.getBoundingClientRect();
  floatText(rect.left + rect.width/2 - 15, rect.top - 5, '-' + damage, 'damage');
  setTimeout(function() {
    el.classList.remove('animate-flash-red');
    el.classList.remove('animate-shake');
  }, 400);
}

function playHealAnimation(heroId, amount) {
  var el = document.getElementById('hero-' + heroId);
  if (!el) return;
  el.classList.add('animate-pulse-green');
  var rect = el.getBoundingClientRect();
  floatText(rect.left + rect.width/2 - 15, rect.top - 25, '+' + amount, 'heal');
  setTimeout(function() { el.classList.remove('animate-pulse-green'); }, 500);
}

function playBlockAnimation(heroId, damage) {
  var el = document.getElementById('hero-' + heroId);
  if (!el) return;
  el.classList.add('animate-shield');
  var rect = el.getBoundingClientRect();
  floatText(rect.left + rect.width/2 - 30, rect.top - 40, 'BLOCKED -' + damage, 'block');
  setTimeout(function() { el.classList.remove('animate-shield'); }, 500);
}

function playDeathAnimation(elId) {
  var el = document.getElementById(elId);
  if (!el) return;
  el.classList.add('animate-fade-out');
  el.style.opacity = '0';
}

function playMonsterDeathAnimation() {
  var el = document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card:first-child');
  if (!el) return;
  el.classList.add('animate-fade-out');
  var rect = el.getBoundingClientRect();
  // Particle burst
  for (var i = 0; i < 12; i++) {
    var p = document.createElement('div');
    p.className = 'projectile-trail animate-explode';
    p.style.background = ['#ef4444','#f97316','#a855f7','#fbbf24'][i % 4];
    p.style.width = '5px';
    p.style.height = '5px';
    p.style.left = (rect.left + rect.width/2 - 2.5) + 'px';
    p.style.top = (rect.top + rect.height/2 - 2.5) + 'px';
    document.body.appendChild(p);
    setTimeout(function() { p.remove(); }, 400);
  }
  setTimeout(function() {
    if (el) el.style.display = 'none';
  }, 600);
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

    if (combatInterval) clearInterval(combatInterval);
    combatInterval = setInterval(pollCombat, 1500);
    return pollCombat();
  })
  .catch(function(err) { alert(err.message); })
  .finally(function() {
    btn.disabled = false;
    btn.textContent = '\\u2694\\uFE0F Enter Dungeon';
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
  icon.textContent = won ? '\\uD83C\\uDFC6' : '\\uD83D\\uDC80';

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
    btn.textContent = '\\u23F9 STOP';
    info.classList.add('show');
    info.innerHTML = '\\uD83D\\udd04 Looping | Runs: <strong id="run-count-display">' + loopCount + '</strong> | Gold: <strong id="gold-count-display">' + totalGoldEarned + '</strong>';
  } else {
    btn.classList.remove('active');
    btn.textContent = '\\uD83D\\udd04 LOOP';
    info.classList.remove('show');
  }
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
    if (type === 'mage') return '\\uD83D\\uDD2E';
    if (type === 'range') return '\\uD83C\\uDFF9';
    return '\\uD83D\\uDDE1\\uFE0F';
  }
  if (armorSlots.indexOf(slot) !== -1) return '\\uD83D\\uDEE1\\uFE0F';
  if (accessorySlots.indexOf(slot) !== -1) return '\\uD83D\\uDC8D';
  return '\\uD83D\\uDEE1\\uFE0F';
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
        '<div class="item-icon">' + getItemEmoji(slot, item.type) + '</div>' +
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
    icon.textContent = getItemEmoji(item.slot, item.type);
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
      '<span style="color:#fbbf24">\\u2694\\uFE0F ' + (m.stats.atk ?? 0) + '</span>' +
      '<span style="color:#7c3aed">\\uD83D\\uDEE1\\uFE0F ' + (m.stats.def ?? 0) + '</span>' +
      '<span style="color:#22c55e">\\u2764\\uFE0F ' + (m.stats.hp ?? 0) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;font-size:.75rem">' +
      (m.isOnline ? '<span style="color:#22c55e">\\u25CF Online</span>' : '<span style="color:#555577">\\u25CB Offline</span>');

    if (m.isBot) {
      html += '<button onclick="removeBot(&apos;' + m.playerId + '&apos;)" style="color:red;border:1px solid red;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;cursor:pointer;margin-left:auto">\\u2716 Remove Bot</button>';
    }

    if (m.playerId === hero.playerId) {
      html += '<button onclick="changeRole()" style="border:1px solid #7c3aed;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;color:#7c3aed;cursor:pointer;margin-left:auto">Change Role</button>';
    }

    html += '</div>';
    card.innerHTML = html;
    membersDiv.appendChild(card);
  }

  loadInvites();
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
