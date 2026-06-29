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
var PHASE_GAP_MS = (typeof ANIMATION_CONFIG !== 'undefined') ? ANIMATION_CONFIG.phaseGapMs : 200;

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
        await sleep(150);
        createExplosion(monEl, color);
        if (monEl) {
          monEl.classList.add('monster-hit-react');
          monEl.addEventListener('animationend', function handler() {
            if (monEl) monEl.classList.remove('monster-hit-react');
            monEl.removeEventListener('animationend', handler);
          }, { once: true });
        }
        var mr = monEl.getBoundingClientRect();
        floatText(mr.left + mr.width/2, mr.top + mr.height/2, e.damage, 'damage');
      } else {
        // Range volley — fire 3 arrows in quick succession
        var volleyCount = 3;
        for (var vi = 0; vi < volleyCount; vi++) {
          var delay = vi * 120;
          setTimeout(function(idx) {
            createProjectile(el, monEl, '#c8a060', true);
            // Each arrow hits with a small flash
            setTimeout(function() {
              monEl.classList.add('monster-hit-react');
              monEl.addEventListener('animationend', function handler() {
                monEl.classList.remove('monster-hit-react');
                monEl.removeEventListener('animationend', handler);
              }, { once: true });
              if (idx === volleyCount - 1) {
                monEl.classList.add('animate-flash-white');
                monEl.addEventListener('animationend', function handler2() {
                  monEl.classList.remove('animate-flash-white');
                  monEl.removeEventListener('animationend', handler2);
                }, { once: true });
                var hr = monEl.getBoundingClientRect();
                floatText(hr.left + hr.width/2, hr.top + hr.height/2, e.damage, 'damage');
              }
            }, 450);
          }, delay, vi);
        }
        await sleep(volleyCount * 120 + 500);
      }
    } else {
      // Melee — slash mark on the monster
      var animClass = (e.role === 'tank') ? 'animate-shield' : 'animate-slash';
      el.classList.add(animClass);
      el.classList.add('hero-attack-lunge');
      if (monEl && e.role !== 'tank') {
        var mr = monEl.getBoundingClientRect();
        monEl.style.position = 'relative';
        // Add two crossing slash marks
        for (var si = 0; si < 2; si++) {
          var slash = document.createElement('div');
          slash.className = 'slash-mark';
          slash.style.top = '50%';
          slash.style.left = '50%';
          if (si === 1) { slash.style.transform = 'translate(-50%,-50%) rotate(25deg) scaleX(0)'; slash.style.animationDelay = '.05s'; }
          monEl.appendChild(slash);
        }
        emitParticles('hit', mr.left + mr.width/2, mr.top + mr.height/2, 8);
        monEl.classList.add('animate-flash-white', 'monster-hit-react');
        // Show damage number on monster
        floatText(mr.left + mr.width/2, mr.top + mr.height/2, e.damage, 'damage');
        monEl.style.animationPlayState = 'paused';
        await sleep(120);
        monEl.style.animationPlayState = '';
        await sleep(getAnimDuration(animClass) - 120);
        monEl.classList.remove('animate-flash-white', 'monster-hit-react');
        // Remove slash marks
        var marks = monEl.querySelectorAll('.slash-mark');
        for (var si = 0; si < marks.length; si++) marks[si].remove();
      } else {
        await sleep(getAnimDuration(animClass) + 50);
      }
      el.classList.remove(animClass, 'hero-attack-lunge');
    }
  })();
}

function playMonsterHit(e) {
  return (async function() {
    var monEl = findMonsterCard(e.monsterName);
    if (!monEl) return;
    var heroEl = document.getElementById('hero-' + e.heroId);
    var targetRect = heroEl ? heroEl.getBoundingClientRect() : monEl.getBoundingClientRect();
    floatText(targetRect.left + targetRect.width/2 - 20, targetRect.top + targetRect.height/2 - 10, e.damage, 'damage');
    emitParticles('hit', targetRect.left + targetRect.width/2, targetRect.top + targetRect.height/2, 6);

    // Determine monster attack type from name hash (consistent per monster)
    var nameHash = 0;
    var name = e.monsterName || '';
    for (var hi = 0; hi < name.length; hi++) nameHash = (nameHash * 31 + name.charCodeAt(hi)) & 0xffff;
    var atkType = nameHash % 3; // 0=melee, 1=range, 2=mage

    if (atkType === 2 && heroEl) {
      // Mage-style: magic projectile from monster to hero
      // Monster lunges forward, then fires
      monEl.classList.add('monster-lunge');
      await sleep(100);
      monEl.classList.remove('monster-lunge');
      var colors = ['#ff4444', '#44ff44', '#ff44ff', '#ffff44'];
      var color = colors[nameHash % colors.length];
      createProjectile(monEl, heroEl, color, false);
      await sleep(350);
      createExplosion(heroEl, color);
      var hr2b = heroEl.getBoundingClientRect();
      floatText(hr2b.left + hr2b.width/2, hr2b.top + hr2b.height/2 - 30, e.damage, 'damage');
      heroEl.classList.add('animate-flash-red');
      await sleep(200);
      heroEl.classList.remove('animate-flash-red');
    } else if (atkType === 1 && heroEl) {
      // Range-style: volley of arrows from monster to hero
      monEl.classList.add('monster-lunge');
      await sleep(100);
      monEl.classList.remove('monster-lunge');
      var hr2 = heroEl.getBoundingClientRect();
      var volleyCount = 3;
      for (var vi = 0; vi < volleyCount; vi++) {
        (function(idx) {
          setTimeout(function() {
            createProjectile(monEl, heroEl, '#ff8844', true);
            setTimeout(function() {
              heroEl.classList.add('animate-hit-react-flash');
              heroEl.addEventListener('animationend', function handler() {
                heroEl.classList.remove('animate-hit-react-flash');
                heroEl.removeEventListener('animationend', handler);
              }, { once: true });
              if (idx === volleyCount - 1) {
                heroEl.classList.add('animate-flash-white');
                heroEl.addEventListener('animationend', function handler2() {
                  heroEl.classList.remove('animate-flash-white');
                  heroEl.removeEventListener('animationend', handler2);
                }, { once: true });
                floatText(hr2.left + hr2.width/2, hr2.top + hr2.height/2, e.damage, 'damage');
              }
            }, 450);
          }, idx * 120);
        })(vi);
      }
      await sleep(volleyCount * 120 + 500);
    } else {
      // Melee-style: slash marks on hero
      if (heroEl) {
        for (var si = 0; si < 2; si++) {
          var slash = document.createElement('div');
          slash.className = 'slash-mark';
          var hr = heroEl.getBoundingClientRect();
          slash.style.position = 'fixed';
          slash.style.top = (hr.top + hr.height / 2) + 'px';
          slash.style.left = (hr.left + hr.width / 2) + 'px';
          slash.style.transform = (si === 0) ? 'translate(-50%,-50%) rotate(-35deg) scaleX(0)' : 'translate(-50%,-50%) rotate(25deg) scaleX(0)';
          if (si === 1) { slash.style.animationDelay = '.05s'; }
          document.body.appendChild(slash);
          setTimeout(function(el) { if (el) el.remove(); }, 400, slash);
        }
      }
      monEl.classList.add('monster-lunge');
      await sleep(150);
      monEl.classList.remove('monster-lunge');
      monEl.classList.add('animate-flash-red');
      await sleep(200);
      monEl.classList.remove('animate-flash-red');
    }

  })();
}

function playBlockEffect(e) {
  return (async function() {
    var hel = document.getElementById('hero-' + e.heroId);
    if (!hel) return;
    // Shield bubble overlay
    var br = hel.getBoundingClientRect();
    var shield = document.createElement('div');
    shield.style.cssText = 'position:fixed;pointer-events:none;z-index:550;left:' + (br.left - 10) + 'px;top:' + (br.top - 10) + 'px;width:' + (br.width + 20) + 'px;height:' + (br.height + 20) + 'px;border:3px solid rgba(100,150,255,.7);border-radius:50%;box-shadow:0 0 30px rgba(100,150,255,.4),inset 0 0 20px rgba(100,150,255,.1);animation:shieldBubble .5s ease-out forwards';
    document.body.appendChild(shield);
    // Spark burst at impact point
    var cx = br.left + br.width/2;
    var cy = br.top + 10;
    for (var si = 0; si < 10; si++) {
      var spark = document.createElement('div');
      spark.style.cssText = 'position:fixed;pointer-events:none;z-index:551;width:4px;height:4px;border-radius:50%;background:#88bbff;box-shadow:0 0 6px #88bbff';
      var angle2 = Math.random() * Math.PI * 2;
      var dist2 = 15 + Math.random() * 30;
      spark.style.left = cx + 'px';
      spark.style.top = cy + 'px';
      spark.style.setProperty('--tx', Math.cos(angle2) * dist2 + 'px');
      spark.style.setProperty('--ty', Math.sin(angle2) * dist2 + 'px');
      spark.style.animation = 'explode .4s ease-out forwards';
      spark.style.animationDelay = (Math.random() * 0.1) + 's';
      document.body.appendChild(spark);
      setTimeout(function(el) { if (el) el.remove(); }, 500, spark);
    }
    hel.classList.add('animate-flash-white');
    floatText(br.left + br.width/2 - 20, br.top + br.height/2 - 10, 'BLOCK', 'block');
    await sleep(500);
    hel.classList.remove('animate-flash-white');
    shield.remove();
  })();
}

function playHealCast(e) {
  return (async function() {
    var el = document.getElementById('hero-' + e.heroId);
    if (!el) return;
    el.classList.add('animate-heal-cast');
    var er = el.getBoundingClientRect();
    // Rising green sparkles
    for (var hsi = 0; hsi < 6; hsi++) {
      var spark = document.createElement('div');
      spark.style.cssText = 'position:fixed;pointer-events:none;z-index:550;width:5px;height:5px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80';
      spark.style.left = (er.left + er.width/2 + (Math.random() - 0.5) * 40) + 'px';
      spark.style.top = (er.top + er.height/2 + (Math.random() - 0.5) * 20) + 'px';
      spark.style.animation = 'healSparkle 1s ease-out forwards';
      spark.style.animationDelay = (Math.random() * 0.3) + 's';
      document.body.appendChild(spark);
      setTimeout(function(el2) { if (el2) el2.remove(); }, 1200, spark);
    }
    await animSleep('animate-heal-cast');
    el.classList.remove('animate-heal-cast');
  })();
}

function playHealed(e) {
  return (async function() {
    var hel = document.getElementById('hero-' + e.heroId);
    if (!hel) return;
    var hr = hel.getBoundingClientRect();
    // Green cross burst
    for (var hi = 0; hi < 8; hi++) {
      var cross = document.createElement('div');
      cross.style.cssText = 'position:fixed;pointer-events:none;z-index:550;width:6px;height:6px;background:#4ade80;border-radius:1px;box-shadow:0 0 8px #4ade80';
      var angle = hi * Math.PI / 4;
      cross.style.left = (hr.left + hr.width/2) + 'px';
      cross.style.top = (hr.top + 10) + 'px';
      cross.style.setProperty('--tx', Math.cos(angle) * 35 + 'px');
      cross.style.setProperty('--ty', Math.sin(angle) * 35 + 'px');
      cross.style.animation = 'explode .5s ease-out forwards';
      cross.style.animationDelay = (Math.random() * 0.1) + 's';
      document.body.appendChild(cross);
      setTimeout(function(el3) { if (el3) el3.remove(); }, 600, cross);
    }
    emitParticles('heal', hr.left + hr.width/2, hr.top + hr.height/2, 12);
    hel.classList.add('animate-heal-received');
    await animSleep('animate-heal-received');
    hel.classList.remove('animate-heal-received');
    floatText(hr.left + hr.width/2, hr.top + hr.height/2, '+' + e.healAmount, 'heal');
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
  if (!arena || !fromEl || !toEl) return;
  var arenaRect = arena.getBoundingClientRect();
  var fromRect = fromEl.getBoundingClientRect();
  var toRect = toEl.getBoundingClientRect();

  var startX = fromRect.left + fromRect.width/2;
  var startY = fromRect.top + fromRect.height/2;
  var endX = toRect.left + toRect.width/2;
  var endY = toRect.top + toRect.height/2;

  var isArrow = isArc; // arc projectiles use arrow shape
  var proj = document.createElement('div');

  if (isArrow) {
    // Arrow-shaped projectile
    var dx = endX - startX;
    var dy = endY - startY;
    var angle = Math.atan2(dy, dx) * 180 / Math.PI;
    var dist = Math.sqrt(dx*dx + dy*dy);
    proj.className = 'projectile';
    proj.style.cssText = 'position:fixed;pointer-events:none;z-index:500;background:#c8a060;border-radius:0;box-shadow:0 2px 6px rgba(0,0,0,.3)';
    proj.style.width = '24px';
    proj.style.height = '4px';
    proj.style.left = startX + 'px';
    proj.style.top = (startY - 2) + 'px';
    proj.style.transform = 'rotate(' + angle + 'deg)';
    proj.style.transformOrigin = 'left center';
    // Arrowhead
    var head = document.createElement('div');
    head.style.cssText = 'position:absolute;right:-6px;top:-4px;width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #c8a060';
    proj.appendChild(head);
    // Fletching
    var fletch = document.createElement('div');
    fletch.style.cssText = 'position:absolute;left:0;top:-3px;width:8px;height:10px;background:linear-gradient(45deg,transparent 30%,#8a6a3a 30%,#8a6a3a 50%,transparent 50%,transparent 70%,#8a6a3a 70%);border-radius:1px';
    proj.appendChild(fletch);
  } else {
    // Magic projectile — glowing orb with orbiting rings
    proj.className = 'projectile';
    proj.style.cssText = 'position:fixed;pointer-events:none;z-index:500';
    proj.style.left = (startX) + 'px';
    proj.style.top = (startY) + 'px';
    // Core orb
    var orb = document.createElement('div');
    orb.style.cssText = 'position:absolute;left:-8px;top:-8px;width:16px;height:16px;border-radius:50%;background:radial-gradient(circle,#fff 0%,' + color + ' 40%,transparent 70%);box-shadow:0 0 20px ' + color + ',0 0 40px ' + color + ';animation:mageOrbPulse .5s ease-in-out infinite';
    proj.appendChild(orb);
    // Outer glow ring
    var ring = document.createElement('div');
    ring.style.cssText = 'position:absolute;left:-16px;top:-16px;width:32px;height:32px;border-radius:50%;border:2px solid ' + color + ';opacity:.5;box-shadow:0 0 10px ' + color + ';animation:mageRingSpin .8s linear infinite';
    proj.appendChild(ring);
    // Inner sparkle dots
    for (var di = 0; di < 4; di++) {
      var dot = document.createElement('div');
      var angle = di * 90;
      dot.style.cssText = 'position:absolute;left:-2px;top:-10px;width:4px;height:4px;border-radius:50%;background:' + color + ';box-shadow:0 0 6px ' + color + ';animation:mageOrbit' + (di % 2 + 1) + ' .6s ease-in-out infinite';
      dot.style.animationDelay = (di * 0.15) + 's';
      proj.appendChild(dot);
    }
  }
  document.body.appendChild(proj);

  var trailInterval = setInterval(function() {
    if (!proj.parentNode) { clearInterval(trailInterval); return; }
    if (isArrow) {
      // Arrow wind trail
      var trail = document.createElement('div');
      trail.style.cssText = 'position:fixed;pointer-events:none;z-index:499;width:12px;height:2px;border-radius:1px;opacity:0.4';
      trail.style.background = '#d4c090';
      trail.style.left = parseFloat(proj.style.left) - 12 + 'px';
      trail.style.top = parseFloat(proj.style.top) + 'px';
      document.body.appendChild(trail);
      setTimeout(function() { trail.remove(); }, 200);
    } else {
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
    }
  }, isArrow ? 30 : 50);

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
  var cy = rect.top + rect.height/2;

  // Expanding magic rings
  for (var ri = 0; ri < 3; ri++) {
    var ring = document.createElement('div');
    ring.className = 'mage-explosion-ring';
    ring.style.left = (cx - 20) + 'px';
    ring.style.top = (cy - 20) + 'px';
    ring.style.width = '40px';
    ring.style.height = '40px';
    ring.style.borderColor = color;
    ring.style.animationDelay = (ri * 0.1) + 's';
    ring.style.opacity = (1 - ri * 0.25).toString();
    document.body.appendChild(ring);
    ring.addEventListener('animationend', function() { ring.remove(); }, { once: true });
  }

  // Particle burst
  for (var i = 0; i < 16; i++) {
    var spark = document.createElement('div');
    spark.className = 'projectile-trail animate-explode';
    spark.style.background = color;
    var size = 3 + Math.random() * 5;
    spark.style.width = size + 'px';
    spark.style.height = size + 'px';
    spark.style.left = (cx - size/2) + 'px';
    spark.style.top = (cy - size/2) + 'px';
    var angle = Math.random() * Math.PI * 2;
    var dist = 20 + Math.random() * 40;
    spark.style.setProperty('--tx', Math.cos(angle) * dist + 'px');
    spark.style.setProperty('--ty', Math.sin(angle) * dist + 'px');
    spark.style.animationDelay = (Math.random() * 0.15) + 's';
    document.body.appendChild(spark);
    spark.addEventListener('animationend', function() { spark.remove(); }, { once: true });
  }

  el.classList.add('animate-flash-white');
  var rect2 = el.getBoundingClientRect();
  var boomText = ['BOOM!', 'KA-POW!', 'BLAST!', 'WHAM!'][Math.floor(Math.random() * 4)];
  floatText(rect2.left + rect2.width/2 - 20, rect2.top + rect2.height/2 - 10, boomText, 'crit');
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
  if (vf) {
    vf.classList.add('flash');
    vf.addEventListener('animationend', function handler() {
      vf.classList.remove('flash');
      vf.removeEventListener('animationend', handler);
    }, { once: true });
  }

  // Phase 1: Hero attacks (simultaneous)
  var attackEvts = [];
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'hero_attack') attackEvts.push(events[i]);
  }
  if (attackEvts.length > 0) {
    var promises = [];
    for (var i = 0; i < attackEvts.length; i++) {
      var evt = attackEvts[i];
      if (window.addLog) window.addLog('attack', (evt.heroName || 'Hero') + ' attacks ' + (evt.monsterName || 'Monster') + ' for ' + evt.damage);
      promises.push(playHeroAttack(evt));
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
    // Block and hit effects
    for (var i = 0; i < events.length; i++) {
      if (events[i].type === 'hero_hit') {
        var hitEvt = events[i];
        var critStr = hitEvt.isCrit ? ' (CRIT!)' : '';
        if (window.addLog) window.addLog('hit', (hitEvt.monsterName || 'Monster') + ' hits ' + (hitEvt.heroName || 'Hero') + ' for ' + hitEvt.damage + critStr);
        await playMonsterHit(hitEvt);
      }
      if (events[i].type === 'block') {
        if (window.addLog) window.addLog('block', (events[i].monsterName || 'Monster') + ' blocked the attack');
        await playBlockEffect(events[i]);
      }
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
      if (events[i].type === 'heal_cast') {
        if (window.addLog) window.addLog('heal', (events[i].heroName || 'Hero') + ' casts heal');
        await playHealCast(events[i]);
      }
      if (events[i].type === 'healed') {
        if (window.addLog) window.addLog('healed', (events[i].heroName || 'Hero') + ' healed for ' + events[i].healAmount);
        await playHealed(events[i]);
      }
    }
    await sleep(PHASE_GAP_MS);
  }

  // Phase 4: Deaths
  for (var i = 0; i < events.length; i++) {
    if (events[i].type === 'hero_death') {
      if (window.addLog) window.addLog('death', (events[i].heroName || 'Hero') + ' has fallen');
      await playHeroDeath(events[i]);
    }
    if (events[i].type === 'monster_death') {
      if (window.addLog) window.addLog('kill', (events[i].name || events[i].monsterName || 'Monster') + ' defeated!');
      await playMonsterDeath(events[i]);
    }
  }

  // Update HP bars from snapshot
  if (monsters && window.updateMonsterBars) window.updateMonsterBars(monsters);
  if (partyHeroes && window.updateHeroBars) window.updateHeroBars(partyHeroes);
  // Reveal mystery bosses once all trash are cleared
  if (window.revealBoss) window.revealBoss();
};

// Export helpers for other scripts
window.emitParticles = emitParticles;
window.floatText = floatText;

})();
