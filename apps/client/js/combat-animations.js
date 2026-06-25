// ─── Combat Animations ────────────────────────────────────────
// Self-contained animation engine for Jake-Idler combat.
// Consumes events[] from the server and plays CSS/particle effects.
// Loads via <script src="/static/js/combat-animations.js"> in web.ts.
// Architecture: Pokemon Showdown "battle log" pattern.
//
// Exports to window:
//   handleCombatEvents(events, monsters, partyHeroes, roundNum)
//   emitParticles(type, x, y, count)
//   floatText(x, y, text, cls)

(function() {
'use strict';

// ─── Particle System ──────────────────────────────────────────

var PARTICLE_POOL = [];
var PARTICLE_POOL_SIZE = 30;
var PARTICLE_IDX = 0;
var PARTICLE_COLORS = {
  hit:   ['#ff8800', '#ffaa44', '#ffcc66', '#ffffff'],
  death: ['#884422', '#664422', '#442211', '#ff4444'],
  heal:  ['#44cc44', '#66ee66', '#88ff88', '#aaffaa'],
  block: ['#6688ff', '#88aaff', '#aaccff', '#ffffff']
};

for (var pi = 0; pi < PARTICLE_POOL_SIZE; pi++) {
  var p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:500;opacity:0;transition:none';
  document.body.appendChild(p);
  PARTICLE_POOL.push(p);
}

function emitParticles(type, x, y, count) {
  if (!count) count = 8;
  var colors = PARTICLE_COLORS[type] || PARTICLE_COLORS.hit;
  for (var i = 0; i < count; i++) {
    var idx = (PARTICLE_IDX++) % PARTICLE_POOL_SIZE;
    var p = PARTICLE_POOL[idx];
    var angle = Math.random() * Math.PI * 2;
    var speed = 40 + Math.random() * 80;
    var distX = Math.cos(angle) * speed;
    var distY = Math.sin(angle) * speed - 20;
    var color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = 'position:fixed;width:' + (4 + Math.random() * 4) + 'px;height:' + (4 + Math.random() * 4) + 'px;border-radius:50%;pointer-events:none;z-index:500;background:' + color + ';box-shadow:0 0 4px ' + color + ';left:' + x + 'px;top:' + y + 'px;opacity:1;transition:all ' + (300 + Math.random() * 200) + 'ms ease-out';
    p.style.transform = 'translate(' + distX + 'px,' + distY + 'px) scale(0.3)';
    setTimeout(function(p2) { p2.style.opacity = '0'; }, 20, p);
    setTimeout(function(p2) { p2.style.cssText = 'position:fixed;width:6px;height:6px;border-radius:50%;pointer-events:none;z-index:500;opacity:0;transition:none'; }, 600, p);
  }
}

// ─── Floating Text ────────────────────────────────────────────

function floatText(x, y, text, cls) {
  var el = document.createElement('div');
  el.className = 'float-text' + (cls ? ' ' + cls : '');
  el.textContent = text;
  el.style.left = (x + (Math.random() - 0.5) * 40) + 'px';
  el.style.top = (y + (Math.random() - 0.5) * 20) + 'px';
  document.body.appendChild(el);
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 800);
}

// ─── Timing Helpers ───────────────────────────────────────────

var DURATION_CACHE = {};
var PHASE_GAP_MS = 200;

function sleep(ms) {
  return new Promise(function(r) { setTimeout(r, ms); });
}

function animSleep(className) {
  return sleep(getAnimDuration(className) + 50);
}

function getAnimDuration(className) {
  var d = DURATION_CACHE[className];
  if (d !== undefined) return d;
  var el = document.createElement('div');
  el.className = className;
  el.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px';
  document.body.appendChild(el);
  var ms = 300;
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

// ─── Monster Card Lookup ──────────────────────────────────────

function findMonsterCard(monsterName) {
  if (monsterName) {
    var cards = document.querySelectorAll('.monster-card');
    for (var i = 0; i < cards.length; i++) {
      if (cards[i].getAttribute('data-monster-name') === monsterName) return cards[i];
    }
  }
  return document.querySelector('.monster-card.is-focus') || document.querySelector('.monster-card') || null;
}

// ─── Per-Event Animation Handlers ─────────────────────────────

function playHeroAttack(e) {
  return (async function() {
    var el = document.getElementById('hero-' + e.heroId);
    if (!el) return;
    var monEl = findMonsterCard(e.monsterName);
    var wType = e.weaponType || 'melee';

    if ((wType === 'mage' || wType === 'range') && monEl) {
      if (wType === 'mage') {
        var colors = { fire: '#ff8800', ice: '#4488ff', arcane: '#aa44ff' };
        var mageColors = ['#ff8800', '#4488ff', '#aa44ff'];
        var color = mageColors[Math.floor(Math.random() * mageColors.length)];
        createProjectile(el, monEl, color, false);
        await sleep(380);
        createExplosion(monEl, color);
      } else {
        createProjectile(el, monEl, '#88ccff', true);
        await sleep(430);
        monEl.classList.add('animate-flash-white');
        var hr = monEl.getBoundingClientRect();
        floatText(hr.left + hr.width/2 - 20, hr.top - 10, 'HIT!', 'damage');
        await sleep(400);
        monEl.classList.remove('animate-flash-white');
      }
      if (e.crit) {
        var arena = document.querySelector('.arena');
        if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, 500); }
      }
    } else {
      // Melee
      var animClass = (e.role === 'tank') ? 'animate-shield' : 'animate-slash';
      el.classList.add(animClass);
      await sleep(getAnimDuration(animClass) + 50);
      el.classList.remove(animClass);
      if (monEl && e.role !== 'tank') {
        monEl.style.animationPlayState = 'paused';
        await sleep(80);
        monEl.style.animationPlayState = '';
      }
      if (e.crit) {
        var arena = document.querySelector('.arena');
        if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, 500); }
      }
    }
  })();
}

function playMonsterHit(e) {
  return (async function() {
    var monEl = findMonsterCard(e.monsterName);
    if (!monEl) return;
    monEl.classList.add('animate-flash-red', 'animate-shake');
    var mr = monEl.getBoundingClientRect();
    floatText(mr.left + mr.width/2 - 20, mr.top - 10, Math.round(e.damage), 'damage');
    emitParticles('hit', mr.left + mr.width/2, mr.top + mr.height/2, 6);
    await animSleep('animate-flash-red');
    monEl.classList.remove('animate-flash-red', 'animate-shake');
    if (e.crit) {
      var arena = document.querySelector('.arena');
      if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, getAnimDuration('animate-shake-screen') + 50); }
    }
  })();
}

function playBlockEffect(e) {
  return (async function() {
    var hel = document.getElementById('hero-' + e.heroId);
    if (!hel) return;
    hel.classList.add('animate-shield', 'animate-block-burst');
    var br = hel.getBoundingClientRect();
    emitParticles('block', br.left + br.width/2, br.top + br.height/2, 4);
    floatText(br.left + br.width/2 - 20, br.top - 10, 'BLOCK', 'block');
    await animSleep('animate-block-burst');
    hel.classList.remove('animate-shield', 'animate-block-burst');
  })();
}

function playHealCast(e) {
  return (async function() {
    var el = document.getElementById('hero-' + e.heroId);
    if (!el) return;
    el.classList.add('animate-heal-cast');
    await animSleep('animate-heal-cast');
    el.classList.remove('animate-heal-cast');
  })();
}

function playHealed(e) {
  return (async function() {
    var hel = document.getElementById('hero-' + e.heroId);
    if (!hel) return;
    var hr = hel.getBoundingClientRect();
    emitParticles('heal', hr.left + hr.width/2, hr.top + hr.height/2, 8);
    hel.classList.add('animate-heal-received');
    await animSleep('animate-heal-received');
    hel.classList.remove('animate-heal-received');
    floatText(hr.left + hr.width/2 - 20, hr.top - 20, '+' + Math.round(e.healAmount), 'heal');
  })();
}

function playHeroDeath(e) {
  return (async function() {
    var hel = document.getElementById('hero-' + e.heroId);
    if (!hel) return;
    var rect = hel.getBoundingClientRect();
    emitParticles('death', rect.left + rect.width/2, rect.top + rect.height/2, 12);
    hel.classList.add('animate-fade-out');
    await animSleep('animate-fade-out');
  })();
}

function playMonsterDeath(e) {
  return (async function() {
    console.log('[Combat] monster_death event:', JSON.stringify(e));
    var target = findMonsterCard(e.monsterName);
    console.log('[Combat] findMonsterCard result:', target);
    if (!target) return;
    var rect = target.getBoundingClientRect();
    emitParticles('death', rect.left + rect.width/2, rect.top + rect.height/2, 20);
    var arena = document.querySelector('.arena');
    if (arena) { arena.classList.add('animate-shake-screen'); setTimeout(function() { arena.classList.remove('animate-shake-screen'); }, getAnimDuration('animate-shake-screen') + 50); }
    target.classList.add('animate-flash-white');
    await animSleep('animate-flash-white');
    target.classList.remove('animate-flash-white');
    target.classList.add('animate-fade-out');
    await animSleep('animate-fade-out');
    // Remove the dead monster card from the DOM
    if (target.parentNode) target.parentNode.removeChild(target);
  })();
}

// ─── Projectile System (mage/range weapon types) ─────────────

function createProjectile(fromEl, toEl, color, isArc) {
  var arena = document.querySelector('.arena');
  if (!arena) return;
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
  if (!el) return;
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

// ─── Main Entry Point ─────────────────────────────────────────
// Called from the socket handler in web.ts after receiving combat state.
//   events:   CombatEventView[] from server
//   monsters: monster snapshot for HP bar updates
//   partyHeroes: party hero snapshot for HP bar updates

window.handleCombatEvents = async function(events, monsters, partyHeroes, roundNum) {
  if (!events || events.length === 0) return;

  // Vignette flash on round transition
  var vf = document.getElementById('vignette-flash');
  if (vf) { vf.classList.add('flash'); setTimeout(function() { vf.classList.remove('flash'); }, 200); }

  // Phase 1: Hero attacks (simultaneous)
  var attackEvts = [];
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'hero_attack') attackEvts.push(events[i]);
  }
  if (attackEvts.length > 0) {
    var promises = [];
    for (var i = 0; i < attackEvts.length; i++) {
      promises.push(playHeroAttack(attackEvts[i]));
    }
    await Promise.all(promises);
    await sleep(PHASE_GAP_MS);
  }

  // Phase 2: Monster hit + block
  var hasHit = false;
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'hero_hit' || events[i].type === 'block') { hasHit = true; break; }
  }
  if (hasHit) {
    // Shake all monsters
    var allMonsters = document.querySelectorAll('.monster-card');
    for (var mi = 0; mi < allMonsters.length; mi++) {
      if (allMonsters[mi].classList.contains('boss')) { allMonsters[mi].classList.add('animate-shake-screen'); } else { allMonsters[mi].classList.add('animate-shake'); }
    }
    await animSleep('animate-shake');
    for (var mi2 = 0; mi2 < allMonsters.length; mi2++) { allMonsters[mi2].classList.remove('animate-shake-screen', 'animate-shake'); }
    // Block and hit effects
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'hero_hit') await playMonsterHit(events[i]);
      if (events[i].type === 'block') await playBlockEffect(events[i]);
    }
    await sleep(PHASE_GAP_MS);
  }

  // Phase 3: Heals
  var hasHeal = false;
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'heal_cast' || events[i].type === 'healed') { hasHeal = true; break; }
  }
  if (hasHeal) {
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'heal_cast') await playHealCast(events[i]);
      if (events[i].type === 'healed') await playHealed(events[i]);
    }
    await sleep(PHASE_GAP_MS);
  }

  // Phase 4: Deaths
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'hero_death') await playHeroDeath(events[i]);
    if (events[i].type === 'monster_death') await playMonsterDeath(events[i]);
  }

  // Update HP bars from snapshot
  if (monsters && window.updateMonsterBars) window.updateMonsterBars(monsters);
  if (partyHeroes && window.updateHeroBars) window.updateHeroBars(partyHeroes);
};

// Export helpers for other scripts
window.emitParticles = emitParticles;
window.floatText = floatText;

})();
