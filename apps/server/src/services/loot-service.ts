import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  processMonsterLoot,
  generateFloorLoot,
  calculateSalvageValue,
  getCraftCost,
  getCraftGoldCost,
  getSalvageShards,
  getShardSalvageValue,
  generateEquipment,
  shardKey,
  CRAFTABLE_EQUIPMENT_TYPES,
} from "@jake-idler/game";
import { Rarity, type Equipment } from "@jake-idler/game";

/**
 * Interface for shop craft request data.
 */
export interface CraftRequest {
  slot: string;
  type: string;
  rarity: Rarity;
}

class LootService {
  /**
   * Process loot after a monster is defeated.
   * Updates the hero's gold and shards, and optionally drops equipment.
   */
  async processKillLoot(
    heroId: string,
    floorNumber: number,
    isBoss: boolean,
    isBracketBoss: boolean,
  ): Promise<{
    gold: number;
    shards: Record<string, number>;
    shardDrops: Record<string, number>;
    equipment?: Equipment;
  }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) throw new Error("Hero not found");

    const hero = rows[0];
    const currentShards = hero.shards as unknown as Record<string, number>;

    // Roll for loot
    const loot = processMonsterLoot(floorNumber, isBoss, isBracketBoss);

    // Apply shard drops using bracket-level keys (e.g. "rare_10")
    const newShards = { ...currentShards };
    const shardDrops: Record<string, number> = {};
    for (const drop of loot.shards) {
      const key = shardKey(drop.rarity, drop.bracketLevel);
      newShards[key] = (newShards[key] || 0) + drop.amount;
      shardDrops[key] = (shardDrops[key] || 0) + drop.amount;
    }

    // Bracket bosses drop equipment
    let droppedEquipment: Equipment | undefined;
    if (isBracketBoss) {
      droppedEquipment = generateFloorLoot(floorNumber);
      const inventory = (hero.inventory as Equipment[]) || [];
      inventory.push(droppedEquipment);
      await db
        .update(heroes)
        .set({
          inventory: inventory as unknown as unknown[],
          lastActive: new Date().toISOString(),
        })
        .where(eq(heroes.id, heroId));
    }

    // Update gold and shards
    const newGold = hero.gold + loot.gold;
    await db
      .update(heroes)
      .set({
        gold: newGold,
        shards: newShards as any,
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId));

    return {
      gold: loot.gold,
      shards: newShards,
      shardDrops,
      equipment: droppedEquipment,
    };
  }

  /**
   * Craft an equipment item at the shop using shards.
   */
  async craftItem(
    heroId: string,
    slot: string,
    type: string,
    rarity: Rarity,
    bracketLevel: number,
  ): Promise<{ success: boolean; equipment?: Equipment; goldCost?: number; error?: string }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return { success: false, error: "Hero not found" };

    const hero = rows[0];
    const shards = hero.shards as unknown as Record<string, number>;
    const cost = getCraftCost(rarity);

    const goldCost = getCraftGoldCost(rarity, bracketLevel);

    const shardKeyStr = shardKey(rarity, bracketLevel);

    // Check if hero has enough shards
    const currentShards = shards[shardKeyStr] || 0;
    if (currentShards < cost) {
      return { success: false, error: `Not enough ${shardKeyStr} shards (need ${cost}, have ${currentShards})` };
    }

    // Check if hero has enough gold
    if (hero.gold < goldCost) {
      return { success: false, error: `Not enough gold (need ${goldCost}, have ${hero.gold})` };
    }

    // Check inventory space
    const inventory = (hero.inventory as Equipment[]) || [];
    if (inventory.length >= 30) {
      return { success: false, error: "Inventory is full (max 30 items)" };
    }

    // Check for valid slot/type combination
    const validTypes = CRAFTABLE_EQUIPMENT_TYPES[slot];
    if (!validTypes) {
      return { success: false, error: `Invalid slot: ${slot}` };
    }
    if (!validTypes.includes(type)) {
      return { success: false, error: `${type} equipment cannot go in ${slot} slot` };
    }

    // Deduct shards
    const newShards = { ...shards, [shardKeyStr]: currentShards - cost };

    // Generate the item
    const equipment = generateEquipment(slot, type, bracketLevel, rarity);

    // Add to inventory
    inventory.push(equipment);

    await db
      .update(heroes)
      .set({
        shards: newShards as any,
        gold: hero.gold - goldCost,
        inventory: inventory as unknown as unknown[],
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId));

    return { success: true, equipment, goldCost };
  }

  /**
   * Salvage (alchemy) an equipment item for gold.
   * Removes from inventory, gives gold based on item level and rarity.
   */
  async salvageItem(
    heroId: string,
    equipmentId: string,
  ): Promise<{ success: boolean; gold?: number; shards?: Record<string, number>; error?: string }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return { success: false, error: "Hero not found" };

    const hero = rows[0];
    const inventory = (hero.inventory as Equipment[]) || [];

    const idx = inventory.findIndex((i) => i.id === equipmentId);
    if (idx === -1) {
      return { success: false, error: "Equipment not found in inventory" };
    }

    const equipment = inventory[idx];
    const goldValue = calculateSalvageValue(equipment);
    const shardCount = getSalvageShards(equipment.rarity);
    const bracketLevel = Math.ceil(equipment.level / 10) * 10;
    const shardKeyStr = shardKey(equipment.rarity, bracketLevel);

    // Remove from inventory, add gold and shards
    inventory.splice(idx, 1);
    const newGold = hero.gold + goldValue;
    const currentShards = hero.shards as unknown as Record<string, number> || {};
    const newShards = { ...currentShards };
    newShards[shardKeyStr] = (newShards[shardKeyStr] || 0) + shardCount;

    await db
      .update(heroes)
      .set({
        inventory: inventory as unknown as unknown[],
        gold: newGold,
        shards: newShards as any,
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId));

    return { success: true, gold: goldValue, shards: newShards };
  }

  /**
   * Salvage a shard directly for gold (shard → gold conversion).
   */
  async salvageShard(
    heroId: string,
    rarity: Rarity,
    bracketLevel: number,
    amount: number,
  ): Promise<{ success: boolean; gold?: number; error?: string }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return { success: false, error: "Hero not found" };

    const hero = rows[0];
    const shards = hero.shards as unknown as Record<string, number>;
    const key = shardKey(rarity, bracketLevel);
    const owned = shards[key] || 0;

    if (owned < amount) {
      return { success: false, error: `Not enough ${key} shards (have ${owned}, need ${amount})` };
    }

    const goldPerShard = getShardSalvageValue(rarity, bracketLevel);
    const totalGold = goldPerShard * amount;

    const newShards = { ...shards, [key]: owned - amount };
    const newGold = hero.gold + totalGold;

    await db
      .update(heroes)
      .set({
        shards: newShards as any,
        gold: newGold,
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId));

    return { success: true, gold: totalGold };
  }
}

export const lootService = new LootService();
