/**
 * Equipment rarity tiers. Each rarity grants a flat bonus added to the
 * equipment's base level to determine its *effective level*.
 */
export enum Rarity {
  /** +10 bonus to effective level. */
  Common = "common",
  /** +20 bonus to effective level. */
  Uncommon = "uncommon",
  /** +30 bonus to effective level. */
  Rare = "rare",
  /** +40 bonus to effective level. */
  Epic = "epic",
  /** +50 bonus to effective level. */
  Legendary = "legendary",
}

/**
 * All available equipment slots on a hero. A hero has 15 slots total:
 * - 2 weapon/hand slots (right hand weapon, left hand off-hand)
 * - 3 armour slots (helmet, body, legs)
 * - 3 utility slots (boots, belt, gloves)
 * - 1 necklace
 * - 2 rings (left/right)
 * - 2 earrings (left/right)
 * - 2 bracelets (left/right)
 */
export enum EquipmentSlot {
  /** Primary weapon slot (typically melee/mage/range specific). */
  RightHandWeapon = "rightHandWeapon",
  /** Off-hand slot. */
  LeftHand = "leftHand",
  /** Helmet armour slot. */
  Helmet = "helmet",
  /** Body armour slot. */
  Body = "body",
  /** Leg armour slot. */
  Legs = "legs",
  /** Gloves slot. */
  Gloves = "gloves",
  /** Boots slot. */
  Boots = "boots",
  /** Necklace accessory slot. */
  Necklace = "necklace",
  /** Left ring accessory slot. */
  LeftRing = "leftRing",
  /** Right ring accessory slot. */
  RightRing = "rightRing",
  /** Left earring accessory slot. */
  LeftEarring = "leftEarring",
  /** Right earring accessory slot. */
  RightEarring = "rightEarring",
}

/**
 * Equipment archetypes that restrict which weapon/armor slots an item
 * can occupy. Accessory slots accept {@link EquipmentType.Universal}.
 */
export enum EquipmentType {
  /** Melee-class gear — restricted to weapon/armour slots for melee heroes. */
  Melee = "melee",
  /** Mage-class gear — restricted to weapon/armour slots for mage heroes. */
  Mage = "mage",
  /** Range-class gear — restricted to weapon/armour slots for range heroes. */
  Range = "range",
  /** Universal gear — can be worn in any accessory slot regardless of hero class. */
  Universal = "universal",
}

/**
 * Numeric stat offset for each rarity tier.
 * stat = equipmentLevel + RARITY_BONUS[rarity]
 *   Common:    +10 → level 10 gear gives 20
 *   Uncommon:  +20 → level 10 gear gives 30
 *   Rare:      +30 → level 10 gear gives 40
 *   Epic:      +40 → level 10 gear gives 50
 *   Legendary: +50 → level 10 gear gives 60
 *
 * NOTE: GameConfig.RARITY_BONUS is the canonical source.
 * This duplicate exists for the enum export — keep in sync.
 */
export const RARITY_BONUS: Record<Rarity, number> = {
  [Rarity.Common]: 10,
  [Rarity.Uncommon]: 20,
  [Rarity.Rare]: 30,
  [Rarity.Epic]: 40,
  [Rarity.Legendary]: 50,
};

/**
 * Combat formation positions. (Legacy — all heroes fight as DPS.)
 */
export enum CombatPosition {
  Front = "front",
  Middle = "middle",
  Rear = "rear",
}

/**
 * Combat roles derived from equipped gear. (Legacy — all heroes are DPS.)
 */
export enum CombatRole {
  Tank = "tank",
  DPS = "dps",
  Healer = "healer",
}

/** All equipment slots as an array, useful for iteration. */
export const ALL_EQUIPMENT_SLOTS: EquipmentSlot[] = Object.values(EquipmentSlot);
