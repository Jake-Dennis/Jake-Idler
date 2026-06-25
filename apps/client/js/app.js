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

'use strict';

if (!token) { window.location.href = '/game'; throw new Error('No token'); }

var isLooping = false;
var loopCount = 0;
var totalGoldEarned = 0;
var loopRetryCount = 0;
var showingResult = false;
var combatGen = 0;
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
    card.setAttribute('data-monster-name', m.name);
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
    if (m.isBoss) {
      bossRow.appendChild(card);
      // Boss entrance animation
      setTimeout(function() { card.classList.add('animate-boss-entrance'); }, 50);
    }
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



// ─── Combat animations loaded from external file ──────────────
// See /static/js/combat-animations.js (loaded via <script> tag).
// The window.handleCombatEvents function drives all combat visuals
// from the server's events[] array (Pokemon Showdown log pattern).

// ─── Combat animations handled by external file ──────────────
// See /static/js/combat-animations.js. Called via window.handleCombatEvents.
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
    if (!proj.parentNode) { clearInterval(trailInterval); return; }
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
    document.getElementById('round-counter').textContent = 'Round 1';

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
    }
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

  if (isLooping && won) {
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
  document.getElementById('combat-arena').classList.remove('active');
  document.getElementById('start-btn').style.display = '';
  document.getElementById('stop-btn').style.display = 'none';
  document.getElementById('result-overlay').classList.remove('show');
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

  // Re-enter — tick loop handles round processing
  var floor = parseInt(document.getElementById('floor-select').value);
  fetch('/api/heroes/' + hero.id + '/combat/start', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ floor: floor }),
  })
  .then(function(res) { return res.json().then(function(d) { if (!res.ok) throw new Error(d.error || 'Failed'); return d; }); })
  .then(function() {
    loopRetryCount = 0;
    combatGen++;
    showingResult = false;
    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = '';
  })
  .catch(function(err) {
    if (isLooping) {
      // Tick loop auto-retries on next tick if combat is active
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

// ─── Init ──────────────────────────────────────────────────
var loopInfoEl = document.getElementById('loop-info');
console.log('[Game] Loaded hero: ' + hero.name + ' (Lv.' + hero.level + ')');
if (typeof lucide !== 'undefined') lucide.createIcons();

// ─── Socket.IO ──────────────────────────────────────────────
var socket = null;
if (typeof io !== 'undefined' && token) {
  socket = io({ auth: { token: token } });
  socket.on('connect', function() {
    console.log('[Socket] Connected');
    // Join personal hero room for solo combat updates
    socket.emit('hero:join', hero.id);
    fetch('/api/party', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(function(r) { return r.json(); })
      .then(function(d) {
        if (d.party) {
          socket.emit('party:join-room', d.party.id);
          currentParty = d.party;
        }
      })
      .catch(function() {});
  });
  socket.on('party:formation', function() { loadParty(); });
  socket.on('party:member-joined', function() { loadParty(); });
  socket.on('party:member-left', function() { loadParty(); });
  socket.on('party:role-changed', function() { loadParty(); });
  socket.on('connect_error', function(err) { console.error('[Socket] Error:', err.message); });

  // Server-authoritative combat ticks — replaces all polling
  var combatState = null;
  socket.on('party:combat-update', async function(state) {
    if (state.finished) {
      if (state.round && combatState && combatState.round &&
          state.round.round > combatState.round.round) {
        await (window.handleCombatEvents ? window.handleCombatEvents(state.events, state.monsters, state.round?.partyHeroes, state.round?.round) : Promise.resolve());
      }
      document.getElementById('combat-arena').classList.remove('active');
      document.getElementById('start-btn').style.display = '';
      document.getElementById('stop-btn').style.display = 'none';
      showResult({
        floorCompleted: state.floorCompleted,
        floorFailed: state.floorFailed,
        round: state.round,
        result: state.result || {},
        hero: state.hero,
      });
      combatState = null;
      return;
    }

    document.getElementById('combat-arena').classList.add('active');
    document.getElementById('start-btn').style.display = 'none';
    document.getElementById('stop-btn').style.display = '';

    if (combatState && state.round && state.round.round > combatState.round.round) {
      await (window.handleCombatEvents ? window.handleCombatEvents(state.events, state.monsters, state.round?.partyHeroes, state.round?.round) : Promise.resolve());
    } else {
      if (state.monsters) renderMonsters(state.monsters);
      if (state.round && state.round.partyHeroes) {
        renderPartyHeroes(state.round.partyHeroes);
        updateHeroBars(state.round.partyHeroes);
      }
      if (state.round && state.round.currentMonsterName) {
        addLog('info', state.round.currentMonsterName + ' appears!');
      }
    }

    if (state.round) {
      document.getElementById('round-counter').textContent = 'Round ' + state.round.round;
      combatState = state;
    }
  });
}

// ─── Initial state fetch on page load (catches up after refresh) ──
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

// ─── Periodic tab refresh ──
setInterval(function() {
  var tab = document.querySelector('.tab-content.active');
  if (!tab) return;
  if (tab.id === 'tab-equipment') loadEquipment();
  if (tab.id === 'tab-party') loadParty();
  if (tab.id === 'tab-crafting') loadCrafting();
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
      if (socket && currentParty) socket.emit('party:leave-room', currentParty.id);
      showPartyNotInParty();
      return;
    }
    currentParty = data.party;
    showPartyInParty(data.party);
    if (socket) socket.emit('party:join-room', data.party.id);
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

    // Photo or default icon
    var photoHtml = m.photoUrl
      ? '<img src="' + m.photoUrl + '" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid #2a2020;flex-shrink:0">'
      : '<div style="width:32px;height:32px;border-radius:50%;background:#0a080a;border:1px solid #2a2020;display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:#4a454a;flex-shrink:0">' + m.username.charAt(0).toUpperCase() + '</div>';

    var html = '<div style="display:flex;gap:8px;align-items:center">' +
      photoHtml +
      '<div style="flex:1;min-width:0">' +
      '<div style="display:flex;justify-content:space-between;align-items:center">' +
      '<span style="font-weight:600;color:#e0e0e0">' + escHtml(m.username) + '</span>' +
      '<span class="role-badge ' + roleClass + '">' + roleUpper + '</span>' +
      '</div>' +
      '<div style="display:flex;gap:8px;font-size:.75rem;color:#5a555a;margin-top:2px">';

    // Equipped gear summary
    if (m.equipped) {
      var eq = m.equipped;
      var mainHand = eq.rightHandWeapon || eq.leftHand;
      if (mainHand) html += '<span><i data-lucide="sword" style="width:10px;height:10px"></i> ' + (mainHand.name || (mainHand.rarity ? mainHand.rarity.charAt(0).toUpperCase() + mainHand.rarity.slice(1) : '') + ' Weapon') + '</span>';
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
    if (socket && currentParty) socket.emit('party:leave-room', currentParty.id);
    currentParty = data.party;
    showPartyInParty(data.party);
    if (socket) socket.emit('party:join-room', data.party.id);
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
    if (socket && currentParty) socket.emit('party:leave-room', currentParty.id);
    currentParty = data.party;
    showPartyInParty(data.party);
    if (socket) socket.emit('party:join-room', data.party.id);
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
  window.updateHeroBars = updateHeroBars;
  })();
}
})();
