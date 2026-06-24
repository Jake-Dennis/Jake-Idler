# Phase 05: Enemy Combat Feedback - Context

**Gathered:** 2026-06-24
**Status:** Ready for planning
**Mode:** Auto-generated (smart discuss)

## Phase Boundary

Every enemy hit, boss entrance, and death communicates clearly through layered visual feedback and color-coded floating damage numbers.

## Implementation Decisions

### Damage Numbers
- Float up from monster/hero position on HIT steps
- Color-coded: white=normal, gold=crit, red=hero damage taken, green=heal
- Use the existing floatText() function with enhanced styling

### Monster Hit Feedback
- Flash red on hit (already have `.animate-flash-red`)
- Brief shake on hit (already have `.animate-shake`)
- Combined: flash + shake together for layered effect

### Monster Death
- Fade out animation (already have `.animate-fade-out`)
- Add death burst effect (small explosion of particles — will leverage Phase 6)
- For now: fade-out + flash

### Boss Entrance
- Scale-in animation (0→1 with bounce)
- Camera zoom effect (screen shake + vignette)
- Rumble on boss landing

### Boss Death
- Larger, more dramatic fade-out
- Multi-stage: flash → shake → fade-out
- Enhanced screen shake

## Deferred Ideas
- Status effect indicators
- Element-specific death effects (fire→burn, ice→shatter)
