# Gear & Balance Reference

## Equipment Slots (12 total)

| Category | Slots | Count | Stat |
|----------|-------|-------|------|
| Weapon | `rightHandWeapon`, `leftHand` | 2 | ATK |
| Armor | `helmet`, `body`, `legs`, `boots`, `gloves` | 5 | DEF |
| Accessory | `necklace`, `leftRing`, `rightRing`, `leftEarring`, `rightEarring` | 5 | HP |

## Stat Formula

```
Per-slot stat = BASE[category] + itemLevel + rarityFlat
```

| Rarity | Tier | flat | Weapon ATK | Armor DEF | Accessory HP |
|--------|------|------|-----------|-----------|-------------|
| Common | 0 | 0 | 40 + lvl | 10 + lvl | 10 + lvl |
| Uncommon | 1 | 10 | 50 + lvl | 20 + lvl | 20 + lvl |
| Rare | 2 | 20 | 60 + lvl | 30 + lvl | 30 + lvl |
| Epic | 3 | 30 | 70 + lvl | 40 + lvl | 40 + lvl |
| Legendary | 4 | 40 | 80 + lvl | 50 + lvl | 50 + lvl |

### Full Set Totals (Lv10)

| Rarity | ATK (2×) | DEF (5×) | HP (5×) |
|--------|---------|---------|--------|
| Common | 100 | 100 | 100 |
| Uncommon | 120 | 150 | 150 |
| Rare | 140 | 200 | 200 |
| Epic | 160 | 250 | 250 |
| Legendary | 180 | 300 | 300 |

### Full Set Totals (Lv20)

| Rarity | ATK | DEF | HP |
|--------|-----|-----|-----|
| Common | 120 | 150 | 150 |
| Uncommon | 140 | 200 | 200 |
| Rare | 160 | 250 | 250 |
| Epic | 180 | 300 | 300 |
| Legendary | 200 | 350 | 350 |

### Full Set Totals (Lv30)

| Rarity | ATK | DEF | HP |
|--------|-----|-----|-----|
| Common | 140 | 200 | 200 |
| Uncommon | 160 | 250 | 250 |
| Rare | 180 | 300 | 300 |
| Epic | 200 | 350 | 350 |
| Legendary | 220 | 400 | 400 |

## Item Level by Bracket

```
bracketNumber = ceil(floorNumber / 10)
itemLevel = bracketNumber × 10
```

| Floors | Bracket | Item Level |
|--------|---------|------------|
| 1–10 | 1 | 10 |
| 11–20 | 2 | 20 |
| 21–30 | 3 | 30 |
| 31–40 | 4 | 40 |
| 41–50 | 5 | 50 |

## Hero Stats

```
totalATK = sum(weapon ATK)
totalDEF = sum(armor DEF)
totalHP  = sum(accessory HP)
```

Hero level does NOT contribute to stats. All stats come from equipped gear.

## Monster Stats

### Base Values

| Stat | Base |
|------|------|
| ATK | 50 |
| DEF | 5 |
| HP | 1500 |
| SPD | 50 |

### Floor Scaling

```
scale = floor ^ 0.3
```

| Floor | scale | Trash HP | Floor Boss HP | Bracket Boss HP |
|-------|-------|---------|--------------|-----------------|
| 1 | 1.00 | 1,500 | 3,000 | — |
| 2 | 1.23 | 1,845 | 3,690 | — |
| 3 | 1.39 | 2,085 | 4,170 | — |
| 4 | 1.52 | 2,280 | 4,560 | — |
| 5 | 1.62 | 2,430 | 4,860 | — |
| 6 | 1.71 | 2,565 | 5,130 | — |
| 7 | 1.79 | 2,685 | 5,370 | — |
| 8 | 1.87 | 2,805 | 5,610 | — |
| 9 | 1.93 | 2,895 | 5,790 | — |
| 10 | 2.00 | — | — | 7,500 |

### Boss Multipliers

| Type | ATK | DEF | HP | XP | Gold |
|------|-----|-----|-----|-----|------|
| Trash | ×1 | ×1 | ×1 | ×1 | ×1 |
| Floor boss | ×2 | ×2 | ×2 | ×3 | ×3 |
| Bracket boss | ×1 | ×1 | ×2.5 | ×5 (50×scale) | ×5 (30×scale) |

### Party HP Scaling

```
hpScale = 1 + (sqrt(partySize) - 1) × 0.5
```

| Size | HP Multiplier |
|------|-------------|
| Solo | 1.0× |
| Duo | 1.21× |
| Trio | 1.37× |
| Full (4) | 1.5× |

## Combat Formulas

### Hero Damage (per round)

```
baseDMG = max(0, heroATK - monsterDEF)
crit?   = random() < 0.10  (10% chance)
mult    = crit ? 1.5 : 1.0
damage  = round(baseDMG × mult)

avgDMG = (heroATK - monsterDEF) × 1.05
```

### Monster Damage (per hit)

```
ratio = monsterATK / (monsterATK + heroDEF)
base  = 1 + ratio × 9
variance = (random() - 0.5) × 4
crit? = random() < 0.10
dmg   = max(1, round((base + variance) × (crit ? 2 : 1)))
```

The ratio formula ensures monsters always deal 1–10 damage regardless of ATK/DEF gap. A monster with ATK equal to player DEF deals ~5 damage per hit; an overwhelmingly strong monster caps at ~10.

### Round Cap

Combat ends after 100 rounds. If the monster isn't dead by then, the player loses.

## Recommended Rarity Progression (Bracket 1, Lv10 Gear)

| Floor | Min. Rarity | Target ATK | Est. Rounds (trash + boss) | ~Time |
|-------|-------------|-----------|---------------------------|-------|
| 1 | Common | 100 | 47 | 3 min |
| 2 | Common | 100 | 59 | 4 min |
| 3 | Uncommon mix | 110 | 65 | 4.3 min |
| 4 | Uncommon mix | 115 | 68 | 4.5 min |
| 5 | Uncommon mix | 115 | 72 | 4.8 min |
| 6 | Full Uncommon | 120 | 66 | 4.4 min |
| 7 | Full Uncommon | 120 | 69 | 4.6 min |
| 8 | Full Uncommon | 120 | 72 | 4.8 min |
| 9 | Add Rare | 130 | 69 | 4.6 min |
| 10 | Full Rare | 140 | 55 (bracket only) | 3.7 min |

## Loot

### Gold Per Kill

```
gold = round(10 × scale × goldMul)
```

| Floor | Trash | Floor Boss | Bracket Boss |
|-------|-------|-----------|-------------|
| 1 | 10 | 30 | — |
| 5 | 12 | 36 | — |
| 10 | 14 | 42 | 80 |

### XP Per Kill

```
xp = round(20 × scale × xpMul)         (normal)
     round(50 × scale)                  (bracket boss)
```

### Shard Drops

Per kill, independent roll for each rarity at these base rates:

| Rarity | Base Rate | Bracket Boss Mult |
|--------|----------|-------------------|
| Common | 70% | ×3 → effectively guaranteed |
| Uncommon | 20% | ×3 → 60% |
| Rare | 8% | ×3 → 24% |
| Epic | 1.5% | ×3 → 4.5% |
| Legendary | 0.5% | ×3 → 1.5% |

Each successful roll drops 1 shard keyed by `{rarity}_{bracketLevel}` (e.g. `rare_10`).

### Crafting Cost (per item)

```
shardCost = 1 × rarity (e.g. 1 Rare shard)
goldCost  = bracketLevel × rarityMultiplier × 7
```

Rarity multipliers: Common=2, Uncommon=5, Rare=12, Epic=30, Legendary=80.

### Salvage Returns

```
Salvaging equipment → gold + bracket-level shards

gold  = itemLevel × rarityMultiplier × 3
shards = 1/2/4/8/16 per rarity (Common→Legendary)
```

Salvaging a shard directly → `round(bracketLevel × rarityMultiplier × 1.75)` gold.
