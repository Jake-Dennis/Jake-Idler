import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection.js";
import { heroes } from "../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  computeHeroStats,
  computeEquipmentStats,
  createStarterEquipment,
} from "@jake-idler/game";
import type { Equipment, Hero } from "@jake-idler/game";

/**
 * Serialisable hero shape returned by the API.
 * Omits BigNumber internals and BigNumberStatBlock -> plain StatBlock for JSON.
 */
export interface HeroResponse {
  id: string;
  playerId: string;
  name: string;
  level: number;
  gold: number;
  currentFloor: number;
  equipped: Record<string, Equipment | null>;
  inventory: Equipment[];
  shards: Record<string, number>;
  stats: { atk: number; def: number; hp: number; healing: number };
  photoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export class HeroService {
  // ─── Read ──────────────────────────────────────────────────────

  async getHero(heroId: string): Promise<HeroResponse | null> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return null;

    const row = rows[0];
    return this.toResponse(row);
  }

  async getHeroesByPlayer(playerId: string): Promise<HeroResponse[]> {
    const rows = await db.select().from(heroes).where(eq(heroes.playerId, playerId));
    return rows.map((r) => this.toResponse(r));
  }

  // ─── Create ────────────────────────────────────────────────────

  async createHero(playerId: string, name: string): Promise<HeroResponse> {
    const id = uuidv4();
    const starterGear = createStarterEquipment();

    // Auto-equip melee DPS starter set so hero can fight immediately
    const ALL_ARMOUR = ["helmet", "body", "legs", "boots", "gloves"];
    const ALL_ACCESSORIES = [
      "necklace", "leftRing", "rightRing",
      "leftEarring", "rightEarring",
    ];

    const equipped: Record<string, Equipment | null> = {};
    const inventory: Equipment[] = [];

    for (const item of starterGear) {
      // Equip melee weapons and all armour/accessories
      if (
        (item.id === "starter_rightHandWeapon_melee") ||
        (item.id === "starter_leftHand_melee") ||
        ALL_ARMOUR.includes(item.slot) ||
        ALL_ACCESSORIES.includes(item.slot)
      ) {
        equipped[item.slot] = item;
      } else {
        // Range/mage weapons stay in inventory for later swapping
        inventory.push(item);
      }
    }

    const heroForStats = { level: 1, equipped } as Pick<Hero, "level" | "equipped">;
    const computed = computeHeroStats(heroForStats);

    const now = new Date().toISOString();
    const row = await db
      .insert(heroes)
      .values({
        id,
        playerId,
        name,
        level: 1,
        gold: 0,
        currentFloor: 1,
        shards: {},
        equipped: equipped as unknown as Record<string, unknown>,
        inventory: inventory as unknown as unknown[],
        stats: {
          atk: computed.atk.toNumber(),
          def: computed.def.toNumber(),
          hp: computed.hp.toNumber(),
          healing: computed.healing ?? 0,
        },
        lastActive: now,
        createdAt: now,
      })
      .returning();

    return this.toResponse(row[0]);
  }

  // ─── Equip / Unequip ──────────────────────────────────────────

  async equipItem(
    heroId: string,
    equipment: Equipment,
    slot: string,
  ): Promise<HeroResponse | null> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return null;

    const hero = rows[0];
    const equipped = { ...(hero.equipped as Record<string, Equipment | null>) };
    const inventory = [...(hero.inventory as Equipment[])];

    // If target slot is occupied, swap with inventory
    if (equipped[slot]) {
      inventory.push(equipped[slot]!);
    }

    // Recompute item stats using current formula before storing
    equipment.stats = computeEquipmentStats(slot, equipment.level, equipment.rarity as import("@jake-idler/game").Rarity);

    // Remove the item from inventory
    const idx = inventory.findIndex((i) => i.id === equipment.id);
    if (idx !== -1) {
      inventory.splice(idx, 1);
    }

    equipped[slot] = equipment;

    // Recompute hero stats
    const heroForComputation = { level: hero.level, equipped } as Pick<Hero, "level" | "equipped">;
    const computed = computeHeroStats(heroForComputation);

    const updated = await db
      .update(heroes)
      .set({
        equipped: equipped as unknown as Record<string, unknown>,
        inventory: inventory as unknown as unknown[],
        stats: {
          atk: computed.atk.toNumber(),
          def: computed.def.toNumber(),
          hp: computed.hp.toNumber(),
          healing: computed.healing ?? 0,
        },
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId))
      .returning();

    return this.toResponse(updated[0]);
  }

  async unequipItem(
    heroId: string,
    slot: string,
  ): Promise<HeroResponse | null> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return null;

    const hero = rows[0];
    const equipped = { ...(hero.equipped as Record<string, Equipment | null>) };

    const item = equipped[slot];
    if (!item) return this.toResponse(hero);

    // Move item back to inventory
    const inventory = [...(hero.inventory as Equipment[])];
    inventory.push(item);
    equipped[slot] = null;

    // Recompute stats
    const heroForComputation = { level: hero.level, equipped } as Pick<Hero, "level" | "equipped">;
    const computed = computeHeroStats(heroForComputation);

    const updated = await db
      .update(heroes)
      .set({
        equipped: equipped as unknown as Record<string, unknown>,
        inventory: inventory as unknown as unknown[],
        stats: {
          atk: computed.atk.toNumber(),
          def: computed.def.toNumber(),
          hp: computed.hp.toNumber(),
          healing: computed.healing ?? 0,
        },
        lastActive: new Date().toISOString(),
      })
      .where(eq(heroes.id, heroId))
      .returning();

    return this.toResponse(updated[0]);
  }

  // ─── Delete ────────────────────────────────────────────────────

  async deleteHero(heroId: string, playerId: string): Promise<boolean> {
    const rows = await db.select({ id: heroes.id, playerId: heroes.playerId }).from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return false;
    if (rows[0].playerId !== playerId) return false;

    await db.delete(heroes).where(eq(heroes.id, heroId));
    return true;
  }

  // ─── Internal ─────────────────────────────────────────────────

  private toResponse(row: any): HeroResponse {
    const equipped = row.equipped as Record<string, Equipment | null>;
    // Recompute stats using current formula so old DB items get correct values
    // Also strips removed slots (belt, bracelets)
    for (const [slot, item] of Object.entries(equipped)) {
      if (item) {
        item.stats = computeEquipmentStats(slot, item.level, item.rarity as import("@jake-idler/game").Rarity);
      }
    }
    // Also recompute inventory item stats
    const inventory = (row.inventory as Equipment[]) || [];
    for (const item of inventory) {
      if (item) {
        item.stats = computeEquipmentStats(item.slot, item.level, item.rarity as import("@jake-idler/game").Rarity);
      }
    }
    const heroForComputation = { level: row.level, equipped } as Pick<Hero, "level" | "equipped">;
    const computed = computeHeroStats(heroForComputation);

    return {
      id: row.id,
      playerId: row.playerId,
      name: row.name,
      level: row.level,
      gold: row.gold,
      currentFloor: row.currentFloor,
      equipped,
      inventory,
      shards: row.shards as HeroResponse["shards"],
      stats: {
        atk: computed.atk.toNumber(),
        def: computed.def.toNumber(),
        hp: computed.hp.toNumber(),
        healing: computed.healing ?? 0,
      },
      photoUrl: (row.photoUrl as string) ?? null,
      createdAt: row.createdAt as string,
      updatedAt: row.lastActive as string,
    };
  }
}

export const heroService = new HeroService();
