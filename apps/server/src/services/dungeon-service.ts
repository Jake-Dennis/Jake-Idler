import { v4 as uuidv4 } from "uuid";
import { db } from "../db/connection.js";
import { heroes, keys } from "../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import {
  generateFloor,
  getBracketEquipmentLevel,
  getKeyDropChance,
  rollKeyDrop,
  getBracketName,
  getFloorDifficulty,
} from "@jake-idler/game";
import type { Floor } from "@jake-idler/game";

export interface FloorResponse {
  floorNumber: number;
  bracketNumber: number;
  bracketName: string;
  bracketEquipmentLevel: number;
  difficulty: number;
  monsters: Array<{
    id: string;
    name: string;
    isBoss: boolean;
    rank: "trash" | "floorBoss" | "bracketBoss";
    stats: { atk: number; def: number; hp: number };
  }>;
  requiresKey: boolean;
  hasKey: boolean;
}

export interface KeyInfo {
  id: string;
  floorBracket: number;
}

class DungeonService {
  async getFloorState(heroId: string, playerId: string): Promise<FloorResponse | null> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return null;
    const hero = rows[0];
    const floorNumber = hero.currentFloor;
    return this.getFloorPreview(playerId, floorNumber, hero.level);
  }

  async getFloorPreview(playerId: string, floorNumber: number, heroLevel: number): Promise<FloorResponse> {
    const bracketNumber = Math.ceil(floorNumber / 10);
    const isBracketBossFloor = floorNumber % 10 === 0;
    const floor = generateFloor(floorNumber);

    let hasKey = false;
    if (isBracketBossFloor) {
      const keyRows = await db
        .select()
        .from(keys)
        .where(and(eq(keys.playerId, playerId), eq(keys.floorBracket, bracketNumber)))
        .limit(1);
      hasKey = keyRows.length > 0;
    }

    return {
      floorNumber,
      bracketNumber,
      bracketName: getBracketName(bracketNumber),
      bracketEquipmentLevel: getBracketEquipmentLevel(floorNumber),
      difficulty: getFloorDifficulty(floorNumber, heroLevel),
      monsters: [
        ...floor.monsters.map((m) => ({
          id: m.id,
          name: m.name,
          isBoss: false,
          rank: "trash" as const,
          stats: { atk: m.stats.atk.toNumber(), def: m.stats.def.toNumber(), hp: m.stats.hp.toNumber() },
        })),
        {
          id: floor.floorBoss.id,
          name: floor.floorBoss.name,
          isBoss: true,
          rank: "floorBoss" as const,
          stats: { atk: floor.floorBoss.stats.atk.toNumber(), def: floor.floorBoss.stats.def.toNumber(), hp: floor.floorBoss.stats.hp.toNumber() },
        },
        ...(floor.bracketBoss
          ? [{
              id: floor.bracketBoss.id,
              name: floor.bracketBoss.name,
              isBoss: true,
              rank: "bracketBoss" as const,
              stats: { atk: floor.bracketBoss.stats.atk.toNumber(), def: floor.bracketBoss.stats.def.toNumber(), hp: floor.bracketBoss.stats.hp.toNumber() },
            }]
          : []),
      ],
      requiresKey: isBracketBossFloor,
      hasKey,
    };
  }

  async advanceFloor(heroId: string, playerId: string): Promise<{ success: boolean; newFloor: number; error?: string }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return { success: false, newFloor: 0, error: "Hero not found" };

    const hero = rows[0];
    const currentFloor = hero.currentFloor;
    const nextFloor = currentFloor + 1;
    const isBracketBossFloor = currentFloor % 10 === 0;

    if (isBracketBossFloor) {
      const bracketNumber = Math.ceil(currentFloor / 10);
      const keyRows = await db.select().from(keys).where(and(eq(keys.playerId, playerId), eq(keys.floorBracket, bracketNumber))).limit(1);
      if (keyRows.length === 0) return { success: false, newFloor: currentFloor, error: "Key required for this floor" };
      await db.delete(keys).where(eq(keys.id, keyRows[0].id));
    }

    await db.update(heroes).set({ currentFloor: nextFloor, lastActive: new Date().toISOString() }).where(eq(heroes.id, heroId));
    return { success: true, newFloor: nextFloor };
  }

  async tryKeyDrop(heroId: string, playerId: string): Promise<{ dropped: boolean; key?: KeyInfo }> {
    const rows = await db.select().from(heroes).where(eq(heroes.id, heroId)).limit(1);
    if (rows.length === 0) return { dropped: false };
    const floorNumber = rows[0].currentFloor;
    const bracketNumber = Math.ceil(floorNumber / 10);
    if (floorNumber % 10 === 0) return { dropped: false };

    if (rollKeyDrop(floorNumber)) {
      const keyId = uuidv4();
      await db.insert(keys).values({ id: keyId, playerId, floorBracket: bracketNumber, createdAt: new Date().toISOString() });
      return { dropped: true, key: { id: keyId, floorBracket: bracketNumber } };
    }
    return { dropped: false };
  }

  async getPlayerKeys(playerId: string): Promise<KeyInfo[]> {
    const rows = await db.select().from(keys).where(eq(keys.playerId, playerId));
    return rows.map((r) => ({ id: r.id, floorBracket: r.floorBracket }));
  }
}

export const dungeonService = new DungeonService();
