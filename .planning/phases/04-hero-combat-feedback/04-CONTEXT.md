# Phase 04: Hero Combat Feedback - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

Each hero class has a distinct, satisfying attack animation with hit-stop providing visceral weight on impact.

## Implementation Decisions

### Tank
- Existing block animation (shield glow) is sufficient
- Add shield spark particle effect on block (small yellow/white burst)
- Block animation already has `.animate-shield` class

### DPS
- Use weapon type to determine attack animation
- Sword: horizontal slash arc (CSS rotate + translate)
- Dagger: quick stab (fast translate forward and back)
- Axe: overhead swing (scale + rotate)
- The weapon type is determined by `getWeaponType()` which already exists

### Healer
- Healing cast animation: `.animate-heal-cast` — pulsing glow + gentle upward float
- Recipient glow: `.animate-heal-received` — green pulse on the healed target
- New CSS keyframes needed for both

### Mage
- Existing projectile system with element-specific colors (fire/ice/arcane)
- Add element-specific explosion effects (fire=orange burst, ice=blue shatter, arcane=purple implosion)

### Range
- Existing arc projectile system
- Enhance with arrow trail and impact effect

## Deferred Ideas
- Status effect indicators on entities
- Dodge/evasion visual feedback
