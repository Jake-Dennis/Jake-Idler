import { EventEmitter } from "node:events";

// ─── Event Map ────────────────────────────────────────────────
// Every event this rewrite uses. Add a key+type for each new event.

export interface GameEventMap {
  "round:processed": {
    runId: string;
    round: number;
    state: import("../services/combat-service.js").CombatRoundState;
  };
  "run:started": {
    runId: string;
    partyId: string;
    floorNumber: number;
  };
  "run:completed": {
    runId: string;
    reward: {
      goldEarned: number;
      monstersDefeated: number;
      totalMonsters: number;
      shardsEarned: Record<string, number>;
    };
  };
  "run:failed": {
    runId: string;
    goldLost: number;
  };
  "loot:dropped": {
    runId: string;
    heroId: string;
    itemId: string;
  };
  "hero:leveled": {
    heroId: string;
    newLevel: number;
  };
}

// ─── Typed wrapper ────────────────────────────────────────────

type EventMap = GameEventMap;
type EventKey = keyof EventMap;

export class TypedEventEmitter {
  private ee = new EventEmitter();

  emit<K extends EventKey>(event: K, payload: EventMap[K]): boolean {
    return this.ee.emit(event, payload);
  }

  on<K extends EventKey>(event: K, listener: (payload: EventMap[K]) => void): this {
    this.ee.on(event, listener as (...args: unknown[]) => void);
    return this;
  }

  off<K extends EventKey>(event: K, listener: (payload: EventMap[K]) => void): this {
    this.ee.off(event, listener as (...args: unknown[]) => void);
    return this;
  }

  removeAllListeners<K extends EventKey>(event?: K): this {
    if (event) this.ee.removeAllListeners(event as string);
    else this.ee.removeAllListeners();
    return this;
  }

  listenerCount<K extends EventKey>(event: K): number {
    return this.ee.listenerCount(event as string);
  }
}

/** Singleton event bus for the game module. */
export const gameEvents = new TypedEventEmitter();
