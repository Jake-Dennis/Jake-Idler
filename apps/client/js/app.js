(function() {
'use strict';

var hero = window.__INITIAL_HERO__ || null;
var token = window.__INITIAL_TOKEN__ || localStorage.getItem('token') || '';

if (!hero || !hero.id) {
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
}

if (hero && hero.id) {
  (function() {
  'use strict';

  // hero and token are defined in outer scope
  if (!token) { window.location.href = '/game'; throw new Error('No token'); }
  // Show the game container (hidden by default in the combined login/game HTML)
  document.getElementById('game-container').style.display = 'flex';
  // Hide login screens
  var ls = document.getElementById('loginScreen');
  var hs = document.getElementById('heroScreen');
  if (ls) ls.style.display = 'none';
  if (hs) hs.style.display = 'none';

  // Start periodic heartbeat for guild presence
  startHeartbeat();
  loadKeys(hero.currentFloor);

  // Re-filter keys when floor selector changes
  document.getElementById('floor-select')?.addEventListener('change', function() {
    var f = parseInt(this.value);
    loadKeys(f);
  });

var isLooping = false;
var loopCount = 0;
var totalGoldEarned = 0;
var loopRetryCount = 0;
var showingResult = false;
var combatGen = 0;
var combatStartTime = 0;
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
    if (this.dataset.tab === 'friends') loadFriends();
    if (this.dataset.tab === 'chat') loadChat();
    if (this.dataset.tab === 'guild') loadGuild();
  });
});

// ─── Floor Selector ────────────────────────────────────────
(function initFloorSelector() {
  var sel = document.getElementById('floor-select');
  for (var i = 1; i <= hero.currentFloor; i++) {
    var opt = document.createElement('option');
    opt.value = i;
    opt.textContent = 'Floor ' + i + (i === hero.currentFloor ? ' (current)' : '');
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

  // Check if any trash monsters are alive (mystery boss until they're cleared)
  var hasAliveTrash = monsters.some(function(m) { return !m.isBoss && m.hp > 0; });

  var weaponIcons = { melee: 'sword', range: 'crosshair', mage: 'wand' };
  monsters.forEach(function(m, idx) {
    var card = document.createElement('div');
    var mystery = m.isBoss && hasAliveTrash;
    card.className = 'monster-card' + (m.isBoss ? ' boss' : '') + (m.isCurrentFocus ? ' is-focus' : '') + (mystery ? ' mystery' : '');
    card.setAttribute('data-monster-name', m.name);
    card.id = 'monster-' + m.id;
    var pct = m.maxHp > 0 ? (m.hp / m.maxHp) * 100 : 0;
    // Consistent weapon type from name hash
    var nameHash = 0;
    for (var hi = 0; hi < (m.name || '').length; hi++) nameHash = (nameHash * 31 + m.name.charCodeAt(hi)) & 0xffff;
    var wTypes = ['melee', 'range', 'mage'];
    var monWType = wTypes[nameHash % 3];
    var wIcon = weaponIcons[monWType];

    if (mystery) {
      // Store real boss data for later reveal
      card.dataset.realName = m.name;
      card.dataset.realHp = m.hp;
      card.dataset.realMaxHp = m.maxHp;
      card.dataset.realWType = monWType;
      card.dataset.realWIcon = wIcon;
      card.innerHTML =
        '<div class="monster-icon">' +
          '<div style="width:60px;height:60px;border:2px dashed #3a373a;border-radius:8px;display:flex;align-items:center;justify-content:center;margin:0 auto;background:#080608">' +
            '<span style="font-size:1.5rem;color:#3a373a;font-weight:700">?</span>' +
          '</div>' +
        '</div>' +
        '<div class="monster-name" style="color:#3a373a">???</div>' +
        '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner" style="width:0%;background:#1a1518"></div></div>' +
        '<div class="monster-hp" style="color:#3a373a">???</div>';
    } else {
      var icon;
      var imgTag;
      if (m.isBoss) {
        imgTag = monsterImg('boss', m.name);
        icon = imgTag || '<i data-lucide="skull" style="width:36px;height:36px"></i>';
      } else {
        imgTag = monsterImg('trash', m.name, 'width:60px;height:60px;object-fit:contain;display:block;margin:0 auto;border-radius:4px');
        icon = imgTag || '<i data-lucide="bug" style="width:22px;height:22px"></i>';
      }
      card.innerHTML = '<div class="monster-icon">' + icon + '</div>' +
        '<div class="monster-name">' + escHtml(m.name) + '</div>' +
        '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner ' + hpColorClass(m.hp, m.maxHp) + '" style="width:' + pct + '%"></div></div>' +
        '<div class="monster-hp"><i data-lucide="' + wIcon + '" style="width:12px;height:12px;margin-right:4px;vertical-align:middle"></i><span class="monster-hp-text">' + Math.round(m.hp) + '/' + Math.round(m.maxHp) + '</span></div>';
    }
    if (m.isBoss) {
      bossRow.appendChild(card);
      setTimeout(function() { card.classList.add('animate-boss-entrance'); }, 50);
    }
    else monsterRow.appendChild(card);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

/** Reveal mystery bosses once all trash monsters are cleared. */
function revealBoss() {
  var bossCards = document.querySelectorAll('.monster-card.boss.mystery');
  if (bossCards.length === 0) return;

  // Check if any trash monster still exists in the DOM with visible HP
  var trashCards = document.querySelectorAll('.monster-card:not(.boss)');
  var trashAlive = false;
  for (var ti = 0; ti < trashCards.length; ti++) {
    var hpText = trashCards[ti].querySelector('.monster-hp-text');
    if (hpText) {
      var parts = hpText.textContent.split('/');
      if (parts.length === 2 && parseInt(parts[0]) > 0) { trashAlive = true; break; }
    }
  }
  if (trashAlive) return;

  var weaponIcons = { melee: 'sword', range: 'crosshair', mage: 'wand' };
  for (var bi = 0; bi < bossCards.length; bi++) {
    var card = bossCards[bi];
    var realName = card.dataset.realName || '???';
    var realHp = parseFloat(card.dataset.realHp) || 1;
    var realMaxHp = parseFloat(card.dataset.realMaxHp) || 1;
    var realWIcon = card.dataset.realWIcon || 'sword';
    var pct = (realHp / realMaxHp) * 100;

    var imgTag = monsterImg('boss', realName);
    var icon = imgTag || '<i data-lucide="skull" style="width:36px;height:36px"></i>';

    card.classList.remove('mystery');
    card.classList.add('reveal');
    card.innerHTML =
      '<div class="monster-icon">' + icon + '</div>' +
      '<div class="monster-name">' + escHtml(realName) + '</div>' +
      '<div class="hp-bar-outer" style="width:100%"><div class="hp-bar-inner ' + hpColorClass(realHp, realMaxHp) + '" style="width:' + pct + '%"></div></div>' +
      '<div class="monster-hp"><i data-lucide="' + realWIcon + '" style="width:12px;height:12px;margin-right:4px;vertical-align:middle"></i><span class="monster-hp-text">' + Math.round(realHp) + '/' + Math.round(realMaxHp) + '</span></div>';

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

// ─── Render Party Heroes ───────────────────────────────────
function renderPartyHeroes(partyHeroes) {
  var col = document.getElementById('arena-heroes');
  col.innerHTML = '';
  var weaponIcons = { melee: 'sword', range: 'crosshair', mage: 'wand' };
  var icons = { tank: 'shield', dps: 'sword', healer: 'heart' };
  var roleOrder = ['healer', 'dps', 'tank'];
  var roleLabels = { tank: 'TANK', dps: 'DPS', healer: 'HEAL' };

  roleOrder.forEach(function(role) {
    var heroes = partyHeroes.filter(function(h) { return h.role === role; });
    if (heroes.length === 0) return;

    var roleCol = document.createElement('div');
    roleCol.className = 'hero-role-col role-' + role;

    heroes.forEach(function(h) {
      var card = document.createElement('div');
      var role = h.role || 'dps';
      card.className = 'monster-card role-' + role;
      card.id = 'hero-' + h.heroId;
      var pct = h.maxHp > 0 ? (h.hp / h.maxHp) * 100 : 0;
      var heroName = (h.heroId === hero.id) ? hero.name : (h.name || h.heroId.substring(0, 8));
      var photoUrl = (h.heroId === hero.id) ? hero.photoUrl : (h.photoUrl || null);
      var iconName = icons[role] || 'sword';
      if (role === 'dps' && h.weaponType) {
        iconName = weaponIcons[h.weaponType] || 'sword';
      }
      var iconHtml;
      if (photoUrl) {
        iconHtml = '<img style="width:60px;height:60px;object-fit:contain;display:block;margin:0 auto 2px;border-radius:4px" src="' + photoUrl + '" alt="">';
      } else {
        iconHtml = '<i data-lucide="' + iconName + '" style="width:60px;height:60px"></i>';
      }
      card.innerHTML = '<div class="monster-icon">' + iconHtml + '</div>' +
        '<div class="monster-name">' + escHtml(heroName) + '</div>' +
        '<div class="hp-bar-outer"><div class="hp-bar-inner ' + hpColorClass(h.hp, h.maxHp) + '" style="width:' + pct + '%"></div></div>' +
        '<div class="monster-hp"><i data-lucide="' + iconName + '" style="width:12px;height:12px;margin-right:4px;vertical-align:middle"></i>' + Math.round(h.hp) + '/' + Math.round(h.maxHp) + '</div>';
      var img = card.querySelector('img');
      if (img) img.onerror = function() { this.style.display = 'none'; };
      roleCol.appendChild(card);
    });
    col.appendChild(roleCol);
  });
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ─── Update HP Bars ────────────────────────────────────────
function updateMonsterBars(monsters) {
  monsters.forEach(function(m) {
    var el = document.getElementById('monster-' + m.id);
    if (!el) return;
    var hpText = el.querySelector('.monster-hp-text');
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
    var hpText = el.querySelector('.monster-hp');
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



// ─── Combat animations loaded from external file ──────────────
// See /static/js/combat-animations.js (loaded via <script> tag).
// The window.handleCombatEvents function drives all combat visuals
// from the server's events[] array (Pokemon Showdown log pattern).



// ─── Combat Cutscene Playback ──────────────────────────────
async function playCombatCutscene(roundStates, onComplete) {
  if (!roundStates || roundStates.length === 0) {
    onComplete();
    return;
  }
  var prevState = null;
  var bossAnnounced = false;
  for (var i = 0; i < roundStates.length; i++) {
    var rs = roundStates[i];
    // Detect boss phase: boss is focused AND no monster_died event in current round
    var bossNow = rs.monsters && rs.monsters.some(function(m) { return m.isBoss && m.isCurrentFocus; });
    var deathThisRound = rs.events && rs.events.some(function(e) { return e.type === 'monster_death'; });
    var isBossPhase = bossNow && !deathThisRound;

    // Boss phase announcement — show once when transitioning
    if (isBossPhase && !bossAnnounced) {
      bossAnnounced = true;
      var bossAnnounce = document.getElementById('floor-announce');
      if (bossAnnounce) {
        var bossMon = rs.monsters && rs.monsters.find(function(m) { return m.isBoss; });
        var bossImgHtml = bossMon ? monsterImg('boss', bossMon.name) : '';
        bossAnnounce.innerHTML =
          '<div style="display:flex;flex-direction:column;align-items:center;gap:8px">' +
            bossImgHtml +
            '<span style="font-size:2rem;font-weight:900;color:#ef4444;text-shadow:0 0 20px rgba(239,68,68,.6);letter-spacing:6px">BOSS PHASE</span>' +
          '</div>';
        bossAnnounce.style.opacity = '0';
        bossAnnounce.style.transition = 'none';
        bossAnnounce.style.transform = 'scale(0.2)';
        bossAnnounce.offsetHeight;
        bossAnnounce.style.transition = 'opacity .8s ease, transform .8s ease';
        bossAnnounce.style.opacity = '1';
        bossAnnounce.style.transform = 'scale(1)';
        await new Promise(function(r) { setTimeout(r, 2500); });
        bossAnnounce.style.opacity = '0';
        bossAnnounce.style.transition = 'opacity .6s ease';
        await new Promise(function(r) { setTimeout(r, 800); });
        bossAnnounce.innerHTML = '';
      }
    }

    if (prevState) {
      await window.handleCombatEvents(rs.events, rs.monsters, rs.partyHeroes, rs.round);
      // Count kills from monster_death events
      if (rs.events) {
        rs.events.forEach(function(ev) { if (ev.type === 'monster_death') kills++; });
      }
    } else {
      // First round — just render monsters and heroes, no animation
      if (rs.monsters) renderMonsters(rs.monsters);
      if (rs.partyHeroes) renderPartyHeroes(rs.partyHeroes);
    }
    await new Promise(function(r) { setTimeout(r, 200); });
    prevState = rs;
    document.getElementById('round-counter').textContent = 'Round ' + rs.round;
  }
  onComplete();
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
    combatStartTime = Date.now();
    showingResult = false;
    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = '';
    document.getElementById('combat-log').innerHTML = '';
    document.getElementById('round-counter').textContent = 'Round 1';

    // Floor announcement
    var announce = document.getElementById('floor-announce');
    if (announce) {
      var isBossFloor = floor % 10 === 0;
      // Determine which trash mob appears on this floor and show its image if available
      var trashNames = ['Goblin','Skeleton','Slime','Bat','Spider','Wolf','Zombie','Ghost','Orc','Demon'];
      var trashName = trashNames[floor % trashNames.length];
      var trashImgHtml = monsterImg('trash', trashName, 'width:75vw;height:auto;max-height:60vh;object-fit:contain;image-rendering:pixelated;filter:drop-shadow(0 0 20px rgba(251,191,36,.5))');
      announce.innerHTML = '<div style="display:flex;flex-direction:column;align-items:center;gap:8px">' +
        trashImgHtml +
        '<span style="font-size:1.8rem;font-weight:800;color:#fbbf24;text-shadow:0 0 16px rgba(251,191,36,.5),0 2px 4px rgba(0,0,0,.8);letter-spacing:2px">Floor ' + floor + '</span>' +
        (isBossFloor ? '<span style="font-size:.65rem;color:#ef4444;font-weight:700;letter-spacing:3px;text-shadow:0 0 8px rgba(239,68,68,.5)">BRACKET BOSS</span>' : '') +
        '</div>';
      announce.style.opacity = '0';
      announce.style.transition = 'none';
      announce.style.animation = 'none';
      announce.offsetHeight;
      announce.style.transition = 'opacity 1s ease, transform 1s ease';
      announce.style.transform = 'scale(0.3)';
      announce.offsetHeight;
      announce.style.opacity = '1';
      announce.style.transform = 'scale(1)';
      setTimeout(function() {
        announce.style.opacity = '0';
        announce.style.transform = 'scale(1.5)';
        announce.style.transition = 'opacity .8s ease, transform .8s ease';
      }, 2000);
    }

    // Render heroes from the start response
    if (data.heroes && data.heroes.length > 0) {
      renderPartyHeroes(data.heroes);
    }

    // Render monsters from the start response
    if (data.monsters && data.monsters.length > 0) {
      renderMonsters(data.monsters);
    }

    // Wait for floor announcement animation (~1.8s) before starting cutscene
    var cutsceneDelay = announce ? 2800 : 0;
    setTimeout(function() {
      if (data.roundStates && data.roundStates.length > 0) {
        playCombatCutscene(data.roundStates, function() {
        document.getElementById('combat-arena').classList.remove('active');
        document.getElementById('start-btn').style.display = '';
        document.getElementById('stop-btn').style.display = 'none';
        showResult({
          floorCompleted: data.floorCompleted,
          floorFailed: data.floorFailed,
          round: { round: data.totalRounds },
          result: {
            heroWon: data.floorCompleted,
            totalRounds: data.totalRounds,
            goldEarned: data.goldEarned,
            goldLost: data.floorFailed ? data.floorGoldValue : 0,
            monstersDefeated: data.monstersDefeated,
            totalMonsters: data.totalMonsters,
            shardsEarned: data.shardsEarned,
            keyDropped: data.keyDropped,
            keyBracketLevel: data.keyBracketLevel,
            keyConsumed: data.keyConsumed,
            isBracketBossFloor: data.isBracketBossFloor,
          },
        });
        // Refresh hero data so crafting tab has latest shards
        refreshHero();
        loadCrafting();
      });
    } else {
      // No rounds — show result immediately
      showResult({
        floorCompleted: data.floorCompleted,
        floorFailed: data.floorFailed,
        round: { round: 0 },
        result: {
          heroWon: data.floorCompleted,
          totalRounds: 0,
          goldEarned: data.goldEarned,
          goldLost: data.floorFailed ? data.floorGoldValue : 0,
          monstersDefeated: data.monstersDefeated,
          totalMonsters: data.totalMonsters,
          shardsEarned: data.shardsEarned,
          keyDropped: data.keyDropped,
          keyBracketLevel: data.keyBracketLevel,
          keyConsumed: data.keyConsumed,
          isBracketBossFloor: data.isBracketBossFloor,
        },
      });
      refreshHero();
      loadCrafting();
    }
  }, cutsceneDelay);
  })
  .catch(function(err) {
    if (!isLooping) alert(err.message);
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

  // Calculate elapsed time
  var elapsed = combatStartTime > 0 ? Date.now() - combatStartTime : 0;
  var elapsedSec = Math.round(elapsed / 1000);
  var timeStr = '';
  if (elapsedSec >= 60) {
    var min = Math.floor(elapsedSec / 60);
    var sec = elapsedSec % 60;
    timeStr = min + 'm ' + sec + 's';
  } else {
    timeStr = elapsedSec + 's';
  }

  if (won) {
    var shardLines = '';
    var keyLine = '';
    if (r.keyDropped) {
      keyLine = '<br />Key earned: <i data-lucide="key" style="width:14px;height:14px;display:inline-block;vertical-align:middle"></i> Lv.' + r.keyBracketLevel + ' boss key';
    }
    if (r.shardsEarned) {
      var shardKeys = Object.keys(r.shardsEarned).filter(function(k) { return r.shardsEarned[k] > 0; }).sort();
      for (var si = 0; si < shardKeys.length; si++) {
        var sk = shardKeys[si];
        var parts = sk.split('_');
        var sc = rarityColors[parts[0]] || '#aaa';
        shardLines += '<br /><span style="color:' + sc + ';font-size:.78rem">' + parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + ' Lv.' + (parts[1] || '?') + ' shard ×' + r.shardsEarned[sk] + '</span>';
      }
    }
    details.innerHTML = 'Cleared in ' + (r.totalRounds || roundInfo.round || '?') + ' rounds' +
      (timeStr ? ' (' + timeStr + ')' : '!') +
      '<br />Monsters defeated: ' + (r.monstersDefeated || 0) + '/' + (r.totalMonsters || '?') +
      '<br />Gold earned: <strong style="color:#fbbf24">' + (r.goldEarned || 0) + '</strong>' +
      keyLine +
      shardLines;
    if (typeof lucide !== 'undefined') lucide.createIcons();
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

  if (isLooping && won) {
    // Stop loop if bracket boss floor wasn't cleared with a key
    var r = state.result || {};
    if (r.isBracketBossFloor && !r.keyConsumed) {
      isLooping = false;
      loopCount = 0;
      totalGoldEarned = 0;
      updateLoopUI();
      addLog('kill', '[LOOP] Stopped — no key for bracket boss floor');
      retryBtn.style.display = 'inline-flex';
      overlay.classList.add('show');
      return;
    }
    // Auto retry on victory only
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
  // Only stops auto-looping; does NOT skip the current cutscene
  if (isLooping) toggleLoop();
});

function loopRetry() {
  loopRetryCount++;
  if (loopRetryCount > 10) {
    isLooping = false;
    loopRetryCount = 0;
    updateLoopUI();
    document.getElementById('start-btn').style.display = '';
    addLog('kill', '[LOOP] Stopped after 10 consecutive failures');
    return;
  }
  // Reset arena for next run
  document.getElementById('combat-log').innerHTML = '';
  document.getElementById('boss-row').innerHTML = '';
  document.getElementById('monster-row').innerHTML = '';
  document.getElementById('hero-row').innerHTML = '';

  var floor = parseInt(document.getElementById('floor-select').value);
  fetch('/api/heroes/' + hero.id + '/combat/start', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floor }),
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    loopRetryCount = 0;
    combatGen++;
    combatStartTime = Date.now();
    showingResult = false;
    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('start-btn').style.display = 'none';
    if (data.heroes && data.heroes.length > 0) {
      renderPartyHeroes(data.heroes);
    }
    if (data.monsters && data.monsters.length > 0) {
      renderMonsters(data.monsters);
    }

    if (data.roundStates && data.roundStates.length > 0) {
      playCombatCutscene(data.roundStates, function() {
        document.getElementById('combat-arena').classList.remove('active');
        document.getElementById('start-btn').style.display = '';
        document.getElementById('stop-btn').style.display = 'none';
        showResult({
          floorCompleted: data.floorCompleted,
          floorFailed: data.floorFailed,
          round: { round: data.totalRounds },
          result: {
            heroWon: data.floorCompleted,
            totalRounds: data.totalRounds,
            goldEarned: data.goldEarned,
            goldLost: data.floorFailed ? data.floorGoldValue : 0,
            monstersDefeated: data.monstersDefeated,
            totalMonsters: data.totalMonsters,
            shardsEarned: data.shardsEarned,
            keyDropped: data.keyDropped,
            keyBracketLevel: data.keyBracketLevel,
            keyConsumed: data.keyConsumed,
            isBracketBossFloor: data.isBracketBossFloor,
          },
        });
        refreshHero();
        loadCrafting();
      });
    } else {
      showResult({
        floorCompleted: data.floorCompleted,
        floorFailed: data.floorFailed,
        round: { round: 0 },
        result: {
          heroWon: data.floorCompleted,
          totalRounds: 0,
          goldEarned: data.goldEarned,
          goldLost: data.floorFailed ? data.floorGoldValue : 0,
          monstersDefeated: data.monstersDefeated,
          totalMonsters: data.totalMonsters,
          shardsEarned: data.shardsEarned,
          keyDropped: data.keyDropped,
          keyBracketLevel: data.keyBracketLevel,
          keyConsumed: data.keyConsumed,
          isBracketBossFloor: data.isBracketBossFloor,
        },
      });
      refreshHero();
      loadCrafting();
    }
  })
  .catch(function(err) {
    if (isLooping) {
      setTimeout(loopRetry, 2000);
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
  loopRetryCount = 0;
  updateLoopUI();
  // Auto-enter dungeon if not already showing combat
  if (!document.getElementById('combat-arena').classList.contains('active')) {
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

/** Build an img tag for a monster type, hiding on error if no asset exists. */
function monsterImg(type, monsterName, extraStyle) {
  if (!monsterName) return '';
  var name = monsterName.trim().toLowerCase();
  // Extract base monster name (handles "Boss Vicious Goblin" → "Goblin", "Brutal Skeleton" → "Skeleton")
  var baseNames = ['goblin','skeleton','slime','bat','spider','wolf','zombie','ghost','orc','demon'];
  var found = '';
  for (var mi = 0; mi < baseNames.length; mi++) {
    if (name.indexOf(baseNames[mi]) !== -1) { found = baseNames[mi]; break; }
  }
  if (!found) return '';
  var ext = 'png';
  var sty = extraStyle || 'max-width:100%;max-height:12vh;width:auto;height:auto;object-fit:contain;image-rendering:pixelated;display:block;margin:0 auto';
  var folder = type === 'boss' ? 'Boss' : 'Trash-Mobs';
  var displayName = found.charAt(0).toUpperCase() + found.slice(1);
  return '<img src="/assets/' + folder + '/' + displayName + '/' + displayName + '.' + ext + '" style="' + sty + '" onerror="this.style.display=\'none\'" alt="' + displayName + '">';
}

// ─── Init ──────────────────────────────────────────────────
var loopInfoEl = document.getElementById('loop-info');
console.log('[Game] Loaded hero: ' + hero.name + ' (Lv.' + hero.level + ')');
if (typeof lucide !== 'undefined') lucide.createIcons();
updateHeroBar(hero);
// Set up hero avatar photo
var avatarImg = document.getElementById('hero-avatar-img');
if (hero.photoUrl && avatarImg) {
  avatarImg.src = hero.photoUrl;
  avatarImg.style.display = '';
  document.getElementById('hero-avatar-placeholder').style.display = 'none';
}

// ─── Initial state fetch on page load ──
if (token) {
  (function() {
    fetch('/api/heroes/' + hero.id + '/combat/status', {
      headers: { 'Authorization': 'Bearer ' + token },
    })
    .then(function(r) { return r.json(); })
    .then(function(state) {
      if (state.inCombat) {
        document.getElementById('combat-arena').classList.add('active');
        document.getElementById('start-btn').style.display = 'none';
        document.getElementById('stop-btn').style.display = '';
      } else if (state.finished) {
        document.getElementById('combat-arena').classList.remove('active');
        document.getElementById('start-btn').style.display = '';
        document.getElementById('stop-btn').style.display = 'none';
      }
    })
    .catch(function() {});
  })();
}

// ─── Periodic catch-up refresh ──
setInterval(function() {
  var tab = document.querySelector('.tab-content.active');
  if (!tab) return;
  if (tab.id === 'tab-equipment') { loadEquipment(); loadKeys(); }
  if (tab.id === 'tab-crafting') loadCrafting();
}, 30000);

// Faster poll for party tab — catches invites/joins from other players quickly
setInterval(function() {
  var partyTab = document.getElementById('tab-party');
  if (partyTab && partyTab.classList.contains('active')) {
    loadParty();
  }
}, 5000);



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

function loadKeys(floor) {
  fetch('/api/heroes/' + hero.id + '/keys', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    // ── Top menu: show count for selected floor's bracket ──
    var wrap = document.getElementById('hero-bar-keys-wrap');
    var el = document.getElementById('hero-bar-keys');
    if (!data.keys || data.keys.length === 0) {
      if (wrap) wrap.style.display = 'none';
    } else {
      var bracketLevel = Math.ceil((floor || hero.currentFloor) / 10) * 10;
      var matching = data.keys.filter(function(k) { return k.floorBracket === bracketLevel; });
      if (matching.length === 0) {
        if (wrap) wrap.style.display = 'none';
      } else {
        if (wrap) {
          wrap.style.display = 'inline-flex';
          wrap.title = 'Keys for Lv.' + bracketLevel + ' bracket';
        }
        if (el) el.textContent = matching.length;
      }
    }

    // ── Equipment tab: show all keys grouped by bracket under stats ──
    var keyList = document.getElementById('stats-key-list');
    if (!keyList) return;
    if (!data.keys || data.keys.length === 0) {
      keyList.innerHTML = '';
      return;
    }
    // Group by floorBracket
    var groups = {};
    for (var i = 0; i < data.keys.length; i++) {
      var k = data.keys[i];
      groups[k.floorBracket] = (groups[k.floorBracket] || 0) + 1;
    }
    var bracketNames = ['The Abandoned Mines', 'The Shadow Forest', 'The Crystal Caverns', 'The Molten Depths', 'The Sky Citadel'];
    var sorted = Object.keys(groups).map(Number).sort(function(a, b) { return a - b; });
    var html = '<div style="font-size:.7rem;font-weight:600;color:#4a454a;letter-spacing:1px;margin-bottom:4px"><i data-lucide="key" style="width:10px;height:10px;vertical-align:middle"></i> KEYS</div>';
    for (var j = 0; j < sorted.length; j++) {
      var b = sorted[j];
      var bracketNum = b / 10;
      var name = bracketNames[bracketNum - 1] || 'The Void - Level ' + bracketNum;
      html += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:.7rem;padding:1px 0">' +
        '<span style="color:#5a555a">' + name + '</span>' +
        '<span style="color:#fbbf24;font-weight:600"><i data-lucide="key" style="width:9px;height:9px;vertical-align:middle"></i> Lv.' + b + ' <strong style="color:#9a949a">\u00d7' + groups[b] + '</strong></span>' +
        '</div>';
    }
    keyList.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
  })
  .catch(function() {});
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
      loadKeys(hero.currentFloor);
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

    // Determine weapon type from equipped gear (DPS only)
    var partyWType = 'melee';
    if (m.equipped) {
      var pw = m.equipped.rightHandWeapon || m.equipped.leftHand;
      if (pw && pw.type) partyWType = pw.type;
    }
    var partyWIcons = { melee: 'sword', range: 'crosshair', mage: 'wand' };
    var partyWIcon = m.role === 'dps' ? partyWIcons[partyWType] || 'sword' : '';

    // Photo or default icon
    var photoHtml = m.photoUrl
      ? '<img src="' + m.photoUrl + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #2a2020;flex-shrink:0">'
      : '<div style="width:32px;height:32px;border-radius:50%;background:#0a080a;border:1px solid #2a2020;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#4a454a;flex-shrink:0">' + m.username.charAt(0).toUpperCase() + '</div>';

    var html = '<div style="display:flex;gap:8px;align-items:center">' +
      photoHtml +
      '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-weight:600;color:#e0e0e0">' + escHtml(m.username) + '</span>' +
      '<span class="role-badge ' + roleClass + '">' + (m.role === 'dps' && partyWIcon ? '<i data-lucide="' + partyWIcon + '" style="width:12px;height:12px;vertical-align:middle"></i> ' : '') + roleUpper + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;font-size:.75rem;color:#5a555a;margin-top:2px">';

    // Equipped gear summary
    if (m.equipped) {
      var eq = m.equipped;
      var mainHand = eq.rightHandWeapon || eq.leftHand;
      if (mainHand) {
        var hWType = mainHand.type || 'melee';
        var hWIcon = partyWIcons[hWType] || 'sword';
        html += '<span><i data-lucide="' + hWIcon + '" style="width:10px;height:10px"></i> ' + (mainHand.name || (mainHand.rarity ? mainHand.rarity.charAt(0).toUpperCase() + mainHand.rarity.slice(1) : '') + ' Weapon') + '</span>';
      }
    }

    html += '</div>' +
      '<div style="display:flex;gap:8px;font-size:.72rem;color:#8888aa;margin-top:2px">' +
      '<span style="color:#fbbf24">ATK: ' + (m.stats.atk ?? 0) + '</span>' +
      '<span style="color:#7c3aed">DEF: ' + (m.stats.def ?? 0) + '</span>' +
      '<span style="color:#22c55e">HP: ' + (m.stats.hp ?? 0) + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;align-items:center;font-size:.72rem;margin-top:2px">' +
      (m.isOnline ? '<span style="color:#22c55e"><i data-lucide="circle" style="width:8px;height:8px;fill:#22c55e"></i> Online</span>' : '<span style="color:#555577"><i data-lucide="circle" style="width:8px;height:8px"></i> Offline</span>') +
      '</div>' +
      '</div>' +
      '</div>';

    if (m.isBot) {
      html += '<button onclick="removeBot(&apos;' + m.playerId + '&apos;)" style="color:red;border:1px solid red;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;cursor:pointer;margin-left:auto"><i data-lucide="x" style="width:12px;height:12px"></i> Remove Bot</button>';
    }

    if (m.playerId === hero.playerId) {
      html += '<button onclick="changeRole()" style="border:1px solid #7c3aed;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;color:#7c3aed;cursor:pointer;margin-left:auto">Change Role</button>';
    }

    if (currentParty && currentParty.leaderId === hero.playerId && m.playerId !== currentParty.leaderId && !m.isBot) {
      html += '<button onclick="transferLeader(\'' + m.playerId + '\')" style="border:1px solid #fbbf24;border-radius:4px;padding:2px 8px;font-size:.75rem;background:transparent;color:#fbbf24;cursor:pointer;margin-left:4px">Make Leader</button>';
    }

    if (!m.isBot) {
      var ksChecked = m.keyShareOptedIn ? 'checked' : '';
      html += '<label style="margin-left:auto;display:flex;align-items:center;gap:4px;font-size:.72rem;color:#8888aa;cursor:pointer" title="Allow party to use your keys">' +
        '<input type="checkbox" ' + ksChecked + ' onchange="toggleKeyShare()" style="accent-color:#fbbf24;cursor:pointer"> Keys</label>';
    }

    html += '</div>';
    card.innerHTML = html;
    membersDiv.appendChild(card);
  }

  loadPartyFriends(party);
  loadInvites();
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

function loadPartyFriends(party) {
  var container = document.getElementById('party-friends-list');
  if (!container) return;

  fetch('/api/friends', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    container.innerHTML = '';

    if (!data.friends || data.friends.length === 0) {
      container.innerHTML = '<p style="color:#3a373a;font-size:.75rem">No friends yet</p>';
      return;
    }

    var onlineFriends = data.friends.filter(function(f) { return f.isOnline && f.status === 'accepted'; });
    if (onlineFriends.length === 0) {
      container.innerHTML = '<p style="color:#3a373a;font-size:.75rem">No online friends</p>';
      return;
    }

    for (var i = 0; i < onlineFriends.length; i++) {
      var f = onlineFriends[i];
      var alreadyInParty = party.members.some(function(m) { return m.playerId === f.friendId; });

      var card = document.createElement('div');
      card.className = 'party-friend-row';
      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div style="display:flex;align-items:center;gap:6px">' +
            '<span style="width:6px;height:6px;border-radius:50%;background:#22c55e;display:inline-block"></span>' +
            '<span style="color:#e0e0e0;font-weight:600;font-size:.85rem">' + escHtml(f.username) + '</span>' +
          '</div>' +
          (alreadyInParty
            ? '<span style="font-size:.7rem;color:#5a555a">In party</span>'
            : '<button onclick="inviteFriendFromParty(&apos;' + escHtml(f.username) + '&apos;)" class="btn btn-primary btn-sm" style="font-size:.7rem;width:auto">Invite</button>') +
        '</div>';
      container.appendChild(card);
    }
  })
  .catch(function() {
    container.innerHTML = '';
  });
}

function inviteFriendFromParty(username) {
  fetch('/api/party/invite', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    showPartyInParty(data.party);
  })
  .catch(function(err) { alert(err.message); });
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

function toggleKeyShare() {
  fetch('/api/party/key-share', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    if (data.party) {
      currentParty = data.party;
      showPartyInParty(data.party);
    }
  })
  .catch(function(err) { alert(err.message); });
}

function transferLeader(targetPlayerId) {
  if (!confirm('Make this player the party leader?')) return;

  fetch('/api/party/transfer', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetPlayerId: targetPlayerId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    if (data.party) {
      currentParty = data.party;
      showPartyInParty(data.party);
    }
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

// ─── Heartbeat ─────────────────────────────────────────────
var heartbeatTimer = null;
var HEARTBEAT_INTERVAL = 30000;

function startHeartbeat() {
  if (heartbeatTimer) return;
  // Send first heartbeat immediately
  fetch('/api/guilds/heartbeat', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }).then(function(r) { r.text(); }).catch(function() {});
  heartbeatTimer = setInterval(function() {
    fetch('/api/guilds/heartbeat', { method: 'POST', headers: { 'Authorization': 'Bearer ' + token } }).then(function(r) { r.text(); }).catch(function() {});
  }, HEARTBEAT_INTERVAL);
}

function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

// ─── Friends ────────────────────────────────────────────────

function loadFriends() {
  document.getElementById('friends-list').innerHTML = '<p class="loading">Loading friends...</p>';

  fetch('/api/friends', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var list = document.getElementById('friends-list');
    list.innerHTML = '';

    if (!data.friends || data.friends.length === 0) {
      list.innerHTML = '<p style="text-align:center;padding:16px;color:#3a373a;font-size:.78rem">No friends yet. Add some above!</p>';
      return;
    }

    for (var i = 0; i < data.friends.length; i++) {
      var f = data.friends[i];
      var card = document.createElement('div');
      card.className = 'friend-card';

      var dotColor = f.isOnline ? '#22c55e' : '#3a373a';
      var statusText = f.isOnline ? 'Online' : 'Offline';

      card.innerHTML =
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';display:inline-block;flex-shrink:0"></span>' +
          '<div style="flex:1;min-width:0">' +
            '<div style="display:flex;justify-content:space-between;align-items:center">' +
              '<span style="font-weight:600;color:#e0e0e0">' + escHtml(f.username) + '</span>' +
              (f.status === 'pending' ? '<span style="font-size:.65rem;color:#a0a0c0;padding:2px 6px;border:1px solid #2a2040;border-radius:4px">PENDING</span>' : '') +
            '</div>' +
            '<div style="font-size:.7rem;color:' + dotColor + '">' + statusText + '</div>' +
          '</div>' +
            (f.status === 'accepted'
            ? '<button onclick="startWhisperFromFriend(&apos;' + f.friendId + '&apos;,&apos;' + escHtml(f.username) + '&apos;)" class="btn btn-ghost btn-sm" style="font-size:.7rem">PM</button><button onclick="removeFriend(&apos;' + f.id + '&apos;)" class="btn btn-ghost btn-sm" style="font-size:.7rem">Remove</button>'
            : '') +
        '</div>';

      list.appendChild(card);
    }
  })
  .catch(function() {
    document.getElementById('friends-list').innerHTML = '<p style="text-align:center;padding:16px;color:#6a2525;font-size:.78rem">Failed to load friends</p>';
  });

  // Also load pending requests
  loadFriendRequests();
}

function loadFriendRequests() {
  fetch('/api/friends/requests', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    var section = document.getElementById('friend-requests-section');
    var list = document.getElementById('friend-requests-list');
    list.innerHTML = '';

    if (!data.requests || data.requests.length === 0) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    for (var i = 0; i < data.requests.length; i++) {
      var r = data.requests[i];
      var div = document.createElement('div');
      div.className = 'friend-card';
      div.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<span style="font-weight:600;color:#e0e0e0">' + escHtml(r.username) + '</span>' +
          '<button onclick="acceptFriend(&apos;' + r.fromPlayerId + '&apos;)" class="btn btn-primary btn-sm" style="width:auto">Accept</button>' +
        '</div>';
      list.appendChild(div);
    }
  })
  .catch(function() {});
}

function addFriend() {
  var username = document.getElementById('friend-add-input').value.trim();
  if (!username) { document.getElementById('friend-add-result').textContent = 'Enter a username'; return; }

  fetch('/api/friends/add', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() {
    document.getElementById('friend-add-input').value = '';
    document.getElementById('friend-add-result').textContent = 'Friend request sent!';
    document.getElementById('friend-add-result').style.color = '#22c55e';
    loadFriends();
  })
  .catch(function(err) {
    document.getElementById('friend-add-result').textContent = err.message;
    document.getElementById('friend-add-result').style.color = '#ef4444';
  });
}

function acceptFriend(playerId) {
  fetch('/api/friends/accept', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId: playerId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadFriends(); })
  .catch(function(err) { alert(err.message); });
}

function removeFriend(friendId) {
  if (!confirm('Remove this friend?')) return;
  fetch('/api/friends/remove', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ friendId: friendId })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadFriends(); })
  .catch(function(err) { alert(err.message); });
}

// ─── Chat ───────────────────────────────────────────────────

var currentChatChannel = 'global';
var chatWhisperTarget = null;
var chatTimer = null;
var lastChatTs = null;

function loadChat() {
  renderChatMessages();
  if (!chatTimer) {
    chatTimer = setInterval(renderChatMessages, 3000);
  }
}

function switchChatChannel(channel) {
  currentChatChannel = channel;
  document.querySelectorAll('.chat-channel-btn').forEach(function(b) { b.classList.remove('active'); });
  document.querySelector('.chat-channel-btn[data-channel="' + channel + '"]').classList.add('active');
  if (channel !== 'whisper') {
    chatWhisperTarget = null;
    document.getElementById('chat-whisper-target').style.display = 'none';
  }
  lastChatTs = null;
  document.getElementById('chat-messages').innerHTML = '<p style="text-align:center;color:#3a373a;font-size:.78rem;padding:20px">Loading messages...</p>';
  renderChatMessages();
}

function renderChatMessages() {
  var params = 'channel=' + encodeURIComponent(currentChatChannel);
  if (lastChatTs) params += '&since=' + encodeURIComponent(lastChatTs);
  if (currentChatChannel === 'whisper' && chatWhisperTarget) {
    params += '&targetId=' + encodeURIComponent(chatWhisperTarget);
  }

  fetch('/api/chat/messages?' + params, {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.messages || data.messages.length === 0) {
      if (!lastChatTs) {
        document.getElementById('chat-messages').innerHTML = '<p style="text-align:center;color:#3a373a;font-size:.78rem;padding:20px">No messages yet</p>';
      }
      return;
    }

    var container = document.getElementById('chat-messages');
    if (!lastChatTs) container.innerHTML = '';
    lastChatTs = data.messages[data.messages.length - 1].createdAt;

    for (var i = 0; i < data.messages.length; i++) {
      var m = data.messages[i];
      var isMe = m.senderId === hero.playerId;
      var div = document.createElement('div');
      div.className = 'chat-msg';
      div.style.cssText = 'padding:4px 6px;border-radius:4px;margin-bottom:2px;word-break:break-word';

      var nameColor = isMe ? '#7c3aed' : '#fbbf24';
      var time = new Date(m.createdAt).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });

      var whisperLabel = '';
      if (m.channel === 'whisper' && m.targetName) {
        whisperLabel = isMe ? ' to ' + escHtml(m.targetName) : ' from ' + escHtml(m.senderName);
      }

      var nameHtml = m.channel === 'whisper'
        ? '<span style="color:#a0a0c0;font-size:.7rem">' + whisperLabel + '</span>'
        : '<span style="color:' + nameColor + ';font-weight:600;font-size:.78rem">' + escHtml(m.senderName) + '</span>';

      // Click on name to whisper
      var whisperLink = (m.channel !== 'whisper' && !isMe)
        ? ' <span onclick="startWhisper(&apos;' + m.senderId + '&apos;,&apos;' + escHtml(m.senderName) + '&apos;)" style="color:#3a373a;font-size:.65rem;cursor:pointer">[PM]</span>'
        : '';

      div.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
          '<div>' + nameHtml + whisperLink + '</div>' +
          '<span style="font-size:.65rem;color:#3a373a;flex-shrink:0">' + time + '</span>' +
        '</div>' +
        '<div style="font-size:.82rem;color:#c0c0c0;margin-left:4px">' + escHtml(m.message) + '</div>';

      container.appendChild(div);
    }

    container.scrollTop = container.scrollHeight;
  })
  .catch(function() {});
}

function sendChat() {
  var input = document.getElementById('chat-input');
  var message = input.value.trim();
  if (!message) return;

  var body = { channel: currentChatChannel, message: message };
  if (currentChatChannel === 'whisper' && chatWhisperTarget) {
    var nameEl = document.getElementById('chat-whisper-name');
    body.targetId = chatWhisperTarget;
    body.targetName = nameEl.textContent;
  }

  fetch('/api/chat/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() {
    input.value = '';
    lastChatTs = null;
    renderChatMessages();
  })
  .catch(function(err) { alert(err.message); });
}

function startWhisper(playerId, username) {
  chatWhisperTarget = playerId;
  switchChatChannel('whisper');
  document.getElementById('chat-whisper-target').style.display = 'block';
  document.getElementById('chat-whisper-name').textContent = username;
  document.getElementById('chat-input').placeholder = 'Whisper to ' + username + '...';
  document.getElementById('chat-input').focus();
}

function startWhisperFromFriend(playerId, username) {
  // Switch to chat tab first
  document.querySelector('.tab[data-tab="chat"]').click();
  startWhisper(playerId, username);
}

function cancelWhisper() {
  chatWhisperTarget = null;
  document.getElementById('chat-whisper-target').style.display = 'none';
  document.getElementById('chat-input').placeholder = 'Type a message...';
}

// ─── Guild ──────────────────────────────────────────────────

function loadGuild() {
  document.getElementById('guild-not-in').style.display = 'none';
  document.getElementById('guild-in').style.display = 'none';

  // Also load the directory in the background for "not in guild" view
  loadGuildDirectory();

  fetch('/api/guilds/mine', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) {
    if (res.status === 404) {
      showGuildNotIn();
      return null;
    }
    return res.json();
  })
  .then(function(data) {
    if (!data) return;
    showGuildIn(data.guild, data.members, data.party);
  })
  .catch(function() {
    showGuildNotIn();
  });
}

function showGuildNotIn() {
  document.getElementById('guild-not-in').style.display = 'block';
  document.getElementById('guild-in').style.display = 'none';
}

function showGuildIn(guild, members, party) {
  document.getElementById('guild-not-in').style.display = 'none';
  document.getElementById('guild-in').style.display = 'block';
  document.getElementById('guild-name').textContent = guild.name;
  document.getElementById('guild-member-count').textContent = guild.memberCount + '/' + guild.maxMembers;
  document.getElementById('guild-description').textContent = guild.description || '';

  var isLeader = guild.leaderId === hero.playerId;
  document.getElementById('guild-leave-btn').style.display = isLeader ? 'none' : 'inline-flex';
  document.getElementById('guild-disband-btn').style.display = isLeader ? 'inline-flex' : 'none';

  var rosterDiv = document.getElementById('guild-roster');
  rosterDiv.innerHTML = '';

  for (var i = 0; i < members.length; i++) {
    var m = members[i];
    var card = document.createElement('div');
    card.className = 'guild-member-row';

    var dotColor = m.isOnline ? '#22c55e' : '#3a373a';

    var kickBtn = '';
    if (isLeader && m.playerId !== hero.playerId) {
      kickBtn = '<button onclick="kickMember(&apos;' + m.playerId + '&apos;)" class="btn btn-ghost btn-sm" style="font-size:.7rem">Kick</button>';
    }

    card.innerHTML =
      '<div style="display:flex;gap:8px;align-items:center">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' + dotColor + ';display:inline-block;flex-shrink:0"></span>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<span style="font-weight:600;color:#e0e0e0">' + escHtml(m.username) + '</span>' +
            (m.role === 'leader' ? '<span class="role-badge" style="background:#7c3aed;color:#fff;padding:2px 8px;border-radius:4px;font-size:.65rem;font-weight:700">LEADER</span>' : '') +
          '</div>' +
          '<div style="font-size:.7rem;color:' + (m.isOnline ? '#22c55e' : '#3a373a') + '">' + (m.isOnline ? 'Online' : 'Offline') + '</div>' +
        '</div>' +
        kickBtn +
      '</div>';

    rosterDiv.appendChild(card);
  }

  // Render guild lobby (party) info
  var partySection = document.getElementById('guild-party-section');
  var joinBtn = document.getElementById('guild-party-join-btn');
  var leaveBtn = document.getElementById('guild-party-leave-btn');

  if (party && party.members && party.members.length > 0) {
    var partyHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px">';
    for (var pi = 0; pi < party.members.length; pi++) {
      var pm = party.members[pi];
      var dot = pm.isOnline ? '#22c55e' : '#3a373a';
      var name = pm.isBot ? pm.username : escHtml(pm.username);
      partyHtml += '<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;background:#0a080a;border:1px solid #1a1518;border-radius:4px;font-size:.72rem;color:#e0e0e0">' +
        '<span style="width:6px;height:6px;border-radius:50%;background:' + dot + ';display:inline-block"></span>' +
        name + '</span>';
    }
    partyHtml += '</div>';
    partySection.innerHTML = partyHtml;
    joinBtn.style.display = 'none';

    // Check if current player is in the party
    var inParty = party.members.some(function(pm) { return pm.playerId === hero.playerId || (pm.isBot && false); });
    leaveBtn.style.display = inParty ? 'inline-flex' : 'none';
  } else {
    partySection.innerHTML = '<p style="color:#3a373a;font-size:.78rem">No active lobby. Start one to party up!</p>';
    joinBtn.style.display = 'inline-flex';
    leaveBtn.style.display = 'none';
  }
}

function loadGuildDirectory() {
  var dirDiv = document.getElementById('guild-directory');
  if (!dirDiv) return;
  dirDiv.innerHTML = '<p class="loading">Loading guilds...</p>';

  fetch('/api/guilds', {
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data.guilds || data.guilds.length === 0) {
      dirDiv.innerHTML = '<p style="text-align:center;padding:16px;color:#3a373a;font-size:.78rem">No open guilds yet. Create one!</p>';
      return;
    }
    dirDiv.innerHTML = '';
    for (var i = 0; i < data.guilds.length; i++) {
      var g = data.guilds[i];
      var entry = document.createElement('div');
      entry.className = 'guild-card';
      entry.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center">' +
          '<div>' +
            '<div style="font-weight:600;color:#e0e0e0">' + escHtml(g.name) + '</div>' +
            (g.description ? '<div style="font-size:.75rem;color:#5a555a;margin-top:2px">' + escHtml(g.description) + '</div>' : '') +
            '<div style="font-size:.7rem;color:#3a373a;margin-top:2px">' + g.memberCount + '/' + g.maxMembers + ' members</div>' +
          '</div>' +
          '<button onclick="joinGuild(&apos;' + g.id + '&apos;)" class="btn btn-primary btn-sm">Join</button>' +
        '</div>';
      dirDiv.appendChild(entry);
    }
  })
  .catch(function() {
    dirDiv.innerHTML = '<p style="text-align:center;padding:16px;color:#6a2525;font-size:.78rem">Failed to load guilds</p>';
  });
}

function createGuild() {
  var name = document.getElementById('guild-name-input').value.trim();
  if (!name) { alert('Enter a guild name'); return; }

  var description = document.getElementById('guild-desc-input').value.trim();

  fetch('/api/guilds', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name, description: description || undefined })
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function(data) {
    document.getElementById('guild-name-input').value = '';
    document.getElementById('guild-desc-input').value = '';
    loadGuild();
  })
  .catch(function(err) { alert(err.message); });
}

function joinGuild(guildId) {
  fetch('/api/guilds/' + guildId + '/join', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadGuild(); })
  .catch(function(err) { alert(err.message); });
}

function leaveGuild() {
  if (!confirm('Leave your guild?')) return;
  fetch('/api/guilds/mine', { headers: { 'Authorization': 'Bearer ' + token } })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data || !data.guild) { loadGuild(); return; }
    return fetch('/api/guilds/' + data.guild.id + '/leave', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  })
  .then(function() { loadGuild(); })
  .catch(function(err) { alert(err.message); });
}

function disbandGuild() {
  if (!confirm('Are you sure? This will DISBAND your guild permanently.')) return;
  if (!confirm('All members will be removed. Continue?')) return;
  fetch('/api/guilds/mine', { headers: { 'Authorization': 'Bearer ' + token } })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data || !data.guild) { loadGuild(); return; }
    return fetch('/api/guilds/' + data.guild.id, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + token }
    });
  })
  .then(function() { loadGuild(); })
  .catch(function(err) { alert(err.message); });
}

function kickMember(targetPlayerId) {
  if (!confirm('Remove this member from the guild?')) return;
  fetch('/api/guilds/mine', { headers: { 'Authorization': 'Bearer ' + token } })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    if (!data || !data.guild) throw new Error('Not in a guild');
    return fetch('/api/guilds/' + data.guild.id + '/kick', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: targetPlayerId })
    });
  })
  .then(function(res) {
    if (res.status !== 204) return res.json().then(function(d) { throw new Error(d.error || 'Failed'); });
    loadGuild();
  })
  .catch(function(err) { alert(err.message); });
}

// ─── Guild Party ──────────────────────────────────────────

function joinGuildParty() {
  fetch('/api/guilds/party', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() { loadGuild(); })
  .catch(function(err) { alert(err.message); });
}

function leaveGuildParty() {
  fetch('/api/guilds/party/leave', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token }
  })
  .then(function(res) {
    if (res.status !== 204) return res.json().then(function(d) { throw new Error(d.error || 'Failed'); });
    loadGuild();
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
  .then(function(resp) {
    var h = resp.hero || resp;
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

function renderSalvageItems(inventory) {
  var container = document.getElementById('craft-salvage-list');
  if (!container) return;
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

function renderConvertShards(shards) {
  var container = document.getElementById('craft-convert-list');
  if (!container) return;
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
      '<span style="color:#5a555a;font-size:.72rem">' + shards[k] + 'x &rarr; ' + Math.round(goldVal) + 'g</span>' +
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

// ─── Test Boss Phase Button ─────────────────────────────────
document.getElementById('test-boss-btn').addEventListener('click', function() {
  // Remove all trash monster cards
  var monsterRow = document.getElementById('monster-row');
  if (monsterRow) monsterRow.innerHTML = '';
  // Reveal mystery bosses
  if (window.revealBoss) window.revealBoss();
});

// ─── Shake Toggle ───────────────────────────────────────────
// Respect OS-level reduced motion preference
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.body.classList.add('no-shake');
}
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

  // Export functions needed by HTML onclick handlers and combat-animations.js
  window.createParty = createParty;
  window.joinParty = joinParty;
  window.invitePlayer = invitePlayer;
  window.addBot = addBot;
  window.leaveParty = leaveParty;
  window.removeBot = removeBot;
  window.changeRole = changeRole;
  window.acceptInvite = acceptInvite;
  window.updateMonsterBars = updateMonsterBars;
  window.revealBoss = revealBoss;
  window.updateHeroBars = updateHeroBars;
  window.addLog = addLog;
  window.startHeartbeat = startHeartbeat;
  window.stopHeartbeat = stopHeartbeat;
  window.loadGuild = loadGuild;
  window.createGuild = createGuild;
  window.joinGuild = joinGuild;
  window.leaveGuild = leaveGuild;
  window.disbandGuild = disbandGuild;
  window.kickMember = kickMember;
  window.joinGuildParty = joinGuildParty;
  window.leaveGuildParty = leaveGuildParty;
  window.loadFriends = loadFriends;
  window.addFriend = addFriend;
  window.acceptFriend = acceptFriend;
  window.removeFriend = removeFriend;
  window.inviteFriendFromParty = inviteFriendFromParty;
  window.loadChat = loadChat;
  window.switchChatChannel = switchChatChannel;
  window.sendChat = sendChat;
  window.startWhisper = startWhisper;
  window.cancelWhisper = cancelWhisper;
  window.startWhisperFromFriend = startWhisperFromFriend;
  })();
}
})();
