import BigNumber from "break_infinity.js";
import { GameConfig, Rarity, type BigNumberStatBlock, type StatBlock, type Equipment, type Hero } from "./types/index.js";
import { ALL_EQUIPMENT_SLOTS, CombatPosition, CombatRole } from "./types/index.js";

/**
 * Return type for {@link computeHeroStats} — extends {@link BigNumberStatBlock}
 * with raw weapon ATK used for display.
 */
export interface HeroComputedStats extends BigNumberStatBlock {
  /** Total ATK from weapon slots only. */
  weaponAtk: number;
  /** Healing output (used by combat for healer role — equals ATK when role is healer). */
  healing: number;
}

/**
 * Determine which stat category an equipment slot belongs to.
 *
 * - **weapon**: rightHandWeapon, leftHand (melee/ranged/etc.)
 * - **armor**: helmet, body, legs, boots, belt, gloves
 * - **accessory**: necklace, rings, earrings, bracelets
 */
function getSlotCategory(slot: string): "weapon" | "armor" | "accessory" {
  switch (slot) {
    case "rightHandWeapon":
    case "leftHand":
      return "weapon";
    case "helmet":
    case "body":
    case "legs":
    case "boots":
    case "gloves":
      return "armor";
    case "necklace":
    case "leftRing":
    case "rightRing":
    case "leftEarring":
    case "rightEarring":
    case "leftBracelet":
    case "rightBracelet":
      return "accessory";
    default:
      return "accessory";
  }
}

/**
 * Compute the stat block for a single piece of equipment.
 *
 * Formula:
 *   Weapon: ATK = level × 5 + rarityFlat
 *   Armor:  DEF = level × 2 + rarityFlat
 *   Acc:    HP  = level × 2 + rarityFlat
 *
 * Rarity flat bonus: common=0, uncommon=10, rare=20, epic=30, legendary=40
 */
export function computeEquipmentStats(
  slot: string,
  level: number,
  rarity: Rarity,
): StatBlock {
  const category = getSlotCategory(slot);
  const rarityFlat = GameConfig.RARITY_BONUS[rarity] ?? 0;

  switch (category) {
    case "weapon":
      return {
        atk: GameConfig.WEAPON_BASE_ATK + level * GameConfig.WEAPON_ATK_PER_LEVEL + rarityFlat,
        def: 0, hp: 0,
      };
    case "armor":
      return {
        atk: 0,
        def: GameConfig.ARMOR_BASE_DEF + level * GameConfig.ARMOR_DEF_PER_LEVEL + rarityFlat,
        hp: 0,
      };
    case "accessory":
      return {
        atk: 0, def: 0,
        hp: GameConfig.ACC_BASE_HP + level * GameConfig.ACC_HP_PER_LEVEL + rarityFlat,
      };
  }
}

/**
 * Compute a hero's effective stats from their equipped gear + level.
 *
 * Stat distribution:
 *   - ATK comes from weapon slots + hero level bonus
 *   - DEF comes from armour slots + hero level bonus
 *   - HP comes from accessory slots + hero level bonus
 *   - SPD comes from hero level only (no equipment contribution)
 *
 * All values are returned as {@link BigNumber} for late-game safety.
 */
export function computeHeroStats(hero: Pick<Hero, "level" | "equipped">): HeroComputedStats {
  let atk = 0;
  let def = 0;
  let hp = 0;
  let weaponAtk = 0;

  for (const slot of ALL_EQUIPMENT_SLOTS) {
    const item = hero.equipped[slot];
    if (item) {
      atk += item.stats.atk;
      def += item.stats.def;
      hp += item.stats.hp;
    }
  }

  // weaponAtk = ATK from both weapon slots
  const rightHandItem = hero.equipped["rightHandWeapon"];
  if (rightHandItem) weaponAtk += rightHandItem.stats.atk;
  const leftHandItem = hero.equipped["leftHand"];
  if (leftHandItem) weaponAtk += leftHandItem.stats.atk;

  return {
    atk: new BigNumber(Math.max(0, atk)),
    def: new BigNumber(Math.max(0, def)),
    hp: new BigNumber(Math.max(0, hp)),
    spd: new BigNumber(0),
    weaponAtk,
    healing: 0, // computed at combat time based on role
  };
}

/**
 * Determine a hero's combat role and formation position from their equipped gear.
 * All heroes are DPS / Middle (shield and healing off-hand types were removed).
 */
export function getHeroRole(
  _equipped: Record<string, Equipment | null>,
): { role: CombatRole; position: CombatPosition } {
  return { role: CombatRole.DPS, position: CombatPosition.Middle };
}

const WEAPON_TYPES = ["melee", "range", "mage"] as const;

const ARMOUR_SLOTS = ["helmet", "body", "legs", "boots", "gloves"] as const;

const ACCESSORY_SLOTS = [
  "necklace",
  "leftRing",
  "rightRing",
  "leftEarring",
  "rightEarring",
] as const;

/**
 * Create starter equipment for a brand-new hero.
 * Returns all items at Lv10 common — nothing is equipped by default.
 *
 * Includes 3 weapon sets (melee/range/mage) plus all armour and
 * accessory slots so the hero can freely mix and match any role.
 *
 * Shield and healing off-hand are added separately by the server.
 */
export function createStarterEquipment(): Equipment[] {
  const items: Equipment[] = [];
  const rarity = "common" as Rarity;

  // 3 main-hand weapons (melee, range, mage)
  for (const type of WEAPON_TYPES) {
    items.push({
      id: `starter_rightHandWeapon_${type}`,
      name: "",
      slot: "rightHandWeapon" as any,
      type: type as any,
      level: 10,
      rarity,
      stats: computeEquipmentStats("rightHandWeapon", 10, rarity),
      effectiveLevel: 10,
    });
  }

  // 3 off-hand weapons (melee, range, mage)
  for (const type of WEAPON_TYPES) {
    items.push({
      id: `starter_leftHand_${type}`,
      name: "",
      slot: "leftHand" as any,
      type: type as any,
      level: 10,
      rarity,
      stats: computeEquipmentStats("leftHand", 10, rarity),
      effectiveLevel: 10,
    });
  }

  // All armour slots
  for (const slot of ARMOUR_SLOTS) {
    items.push({
      id: `starter_${slot}`,
      name: "",
      slot: slot as any,
      type: "universal" as any,
      level: 10,
      rarity,
      stats: computeEquipmentStats(slot, 10, rarity),
      effectiveLevel: 10,
    });
  }

  // All accessory slots
  for (const slot of ACCESSORY_SLOTS) {
    items.push({
      id: `starter_${slot}`,
      name: "",
      slot: slot as any,
      type: "universal" as any,
      level: 10,
      rarity,
      stats: computeEquipmentStats(slot, 10, rarity),
      effectiveLevel: 10,
    });
  }

  return items;
}
