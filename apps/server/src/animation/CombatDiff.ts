/**
 * CombatDiff — Pure state diffing for combat round transitions.
 *
 * Takes previous and next CombatRoundState snapshots and produces an ordered
 * array of AnimationStep values. No DOM access, no side effects.
 *
 * Per D-01: Pure data flow — CombatStore produces state snapshots,
 * CombatDiff produces AnimationStep[], AnimationQueue consumes them.
 *
 * @module animation/CombatDiff
 */

import type { CombatRoundState, PartyHeroRoundData } from "../services/combat-service.js";
import type { AnimationStep, CombatEffectType } from "./types.js";
import { EFFECT_TO_FSM_STATE } from "./types.js";

/**
 * Compute the set of animation steps needed to transition from one combat
 * round state to the next.
 *
 * @param prev - Previous round state (or null on first poll — returns [])
 * @param next - Current round state
 * @returns Ordered AnimationStep[] describing every visual effect to play
 */
export function computeAnimationSteps(
  prev: CombatRoundState | null,
  next: CombatRoundState,
): AnimationStep[] {
  // First poll or no previous state — nothing to animate
  if (prev === null) return [];

  // Skip duplicate rounds or out-of-order state
  if (next.round <= (prev.round ?? -1)) return [];

  const steps: AnimationStep[] = [];
  let stepIndex = 0;

  // --- Party hero state changes ---

  if (next.partyHeroes && prev.partyHeroes) {
    for (const h of next.partyHeroes) {
      const prevH = findHero(prev.partyHeroes, h.heroId);
      if (!prevH) continue;

      // Hero dealt damage → ATTACK step
      if (h.damage > 0) {
        steps.push({
          type: "ATTACK",
          entityId: `hero-${h.heroId}`,
          weaponType: inferWeaponType(h),
          damage: Math.round(h.damage),
          isCrit: h.crit,
          stepIndex: stepIndex++,
        });

        // Monster takes impact — HIT on the focus monster
        steps.push({
          type: "HIT",
          entityId: null, // resolves to focus monster card
          damage: Math.round(h.damage),
          isCrit: h.crit,
          stepIndex: stepIndex++,
        });
      }

      // Hero received healing → HEAL step
      if (h.healingReceived > 0) {
        steps.push({
          type: "HEAL",
          entityId: `hero-${h.heroId}`,
          healAmount: Math.round(h.healingReceived),
          stepIndex: stepIndex++,
        });
      }

      // Hero took damage
      if (h.damageTaken > 0) {
        const dmgTaken = Math.round(h.damageTaken);
        const fsmTarget = EFFECT_TO_FSM_STATE.HIT;

        steps.push({
          type: "HIT",
          entityId: `hero-${h.heroId}`,
          damage: dmgTaken,
          isCrit: h.monsterCrit,
          stepIndex: stepIndex++,
        });

        // Tank blocks damage
        if (h.role === "tank") {
          steps.push({
            type: "BLOCK",
            entityId: `hero-${h.heroId}`,
            damage: dmgTaken,
            stepIndex: stepIndex++,
          });
        }
      }

      // Hero died — alive → !alive transition
      if (!h.alive && prevH.alive) {
        steps.push({
          type: "DEATH",
          entityId: `hero-${h.heroId}`,
          stepIndex: stepIndex++,
        });
      }
    }
  }

  // --- Monster state changes ---

  // Monster was killed this round
  if (next.monsterJustKilled && !prev.monsterJustKilled) {
    steps.push({
      type: "MONSTER_DEATH",
      entityId: null, // resolves to focus monster card
      stepIndex: stepIndex++,
    });
  }

  // New monster appeared (name changed)
  if (!next.monsterJustKilled && next.currentMonsterName !== prev.currentMonsterName) {
    steps.push({
      type: "MONSTER_APPEAR",
      entityId: null,
      stepIndex: stepIndex++,
    });
  }

  return steps;
}

// ─── Helpers ────────────────────────────────────────────────

/**
 * Find a hero's previous round data by heroId.
 */
function findHero(
  heroes: PartyHeroRoundData[],
  heroId: string,
): PartyHeroRoundData | undefined {
  return heroes.find((h) => h.heroId === heroId);
}

/**
 * Infer weapon type from hero role data.
 * Melee is the default fallback when no weapon info is available
 * in the round data.
 */
function inferWeaponType(_hero: PartyHeroRoundData): "melee" | "mage" | "range" {
  // Currently all heroes are melee by default from round data.
  // Weapon-type-specific data will be added to PartyHeroRoundData
  // in a future phase. For now, the caller (web.ts) overrides the
  // weapon type for the local player hero via getWeaponType().
  return "melee";
}
