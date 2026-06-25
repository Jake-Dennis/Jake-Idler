// ─── Local type mirrors (structural compatibility with combat-service.ts) ───
// We re-declare only the fields we touch so this file has zero imports
// from services/ or routes/ and remains a pure, side-effect-free module.

interface MonsterData {
  id: string;
  name: string;
  isBoss: boolean;
}

interface FloorMonster {
  data: MonsterData;
  maxHp: number;
  currentHp: number;
}

interface PartyHeroRoundData {
  heroId: string;
  name: string;
  role: string;
  position: string;
  damage: number;
  crit: boolean;
  healingDone: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  damageTaken: number;
  monsterCrit: boolean;
  healingReceived: number;
}

interface CombatRoundState {
  round: number;
  totalHeroDamage: number;
  totalHeroCrit: boolean;
  monsterDamage: number;
  monsterCrit: boolean;
  monsterHp: number;
  monsterMaxHp: number;
  finished: boolean;
  heroWon: boolean;
  currentMonsterName: string;
  currentMonsterIsBoss: boolean;
  monstersDefeated: number;
  totalMonsters: number;
  monsterJustKilled: boolean;
  floorCompleted: boolean;
  floorFailed: boolean;
  partyHeroes: PartyHeroRoundData[];
}

interface PartyFloorRunState {
  partyId: string;
  initiatorHeroId: string;
  floorNumber: number;
  heroes: Array<{
    heroId: string;
    name: string;
    role: string;
    position: string;
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    healing: number;
    alive: boolean;
  }>;
  monsters: FloorMonster[];
  currentMonsterIndex: number;
  totalMonsters: number;
  monstersDefeated: number;
  floorCompleted: boolean;
  floorFailed: boolean;
  tickCount: number;
  roundIndex: number;
  lastRound: CombatRoundState | null;
  totalGoldRewarded: number;
  floorGoldValue: number;
  shardsEarned: Record<string, number>;
  finishedAt: number | null;
  events: Array<{
    type: string;
    heroId?: string;
    damage?: number;
    crit?: boolean;
    weaponType?: string;
    role?: string;
    healAmount?: number;
    monsterName?: string;
  }>;
  goldPenaltyApplied?: boolean;
}

// ─── Output types ───────────────────────────────────────────────────────────

export interface CombatEventView {
  type: string;
  heroId?: string;
  damage?: number;
  crit?: boolean;
  weaponType?: string;
  role?: string;
  healAmount?: number;
  monsterName?: string;
}

export interface CombatRoundView {
  round: number;
  heroDamage: number;
  heroCrit: boolean;
  monsterDamage: number;
  monsterCrit: boolean;
  monsterHp: number;
  monsterMaxHp: number;
  totalRounds: number;
  monstersDefeated: number;
  totalMonsters: number;
  currentMonsterName: string;
  currentMonsterIsBoss: boolean;
  monsterJustKilled: boolean;
  partyHeroes: PartyHeroRoundData[];
}

export interface CombatViewState {
  inCombat: boolean;
  finished: boolean;
  floorCompleted: boolean;
  floorFailed: boolean;
  partyCombat: boolean;
  monsters: Array<{
    id: string;
    name: string;
    isBoss: boolean;
    hp: number;
    maxHp: number;
    isCurrentFocus: boolean;
  }>;
  round: CombatRoundView | null;
  events: CombatEventView[];
  floorProgress: {
    monstersDefeated: number;
    totalMonsters: number;
    currentMonsterName: string;
    currentMonsterIsBoss: boolean;
  };
  result?: {
    heroWon: boolean;
    totalRounds: number;
    goldEarned: number;
    goldLost: number;
    monstersDefeated: number;
    totalMonsters: number;
    shardsEarned: Record<string, number>;
  };
}

// ─── Serializer implementation ──────────────────────────────────────────────

function toView(state: PartyFloorRunState, _viewerHeroId: string | null): CombatViewState {
  const inCombat = !state.floorCompleted && !state.floorFailed;
  const finished = state.floorCompleted || state.floorFailed;
  const partyCombat = !state.partyId.startsWith("solo_");
  const currentMonster = state.monsters[state.currentMonsterIndex];

  const monsters = state.monsters
    .filter((m) => m.currentHp > 0)
    .map((m) => ({
      id: m.data.id,
      name: m.data.name,
      isBoss: m.data.isBoss,
      hp: m.currentHp,
      maxHp: m.maxHp,
      isCurrentFocus: m === currentMonster,
    }));

  const round: CombatRoundView | null = state.lastRound
    ? {
        round: state.lastRound.round,
        heroDamage: state.lastRound.totalHeroDamage,
        heroCrit: state.lastRound.totalHeroCrit,
        monsterDamage: state.lastRound.monsterDamage,
        monsterCrit: state.lastRound.monsterCrit,
        monsterHp: state.lastRound.monsterHp,
        monsterMaxHp: state.lastRound.monsterMaxHp,
        totalRounds: state.lastRound.round,
        monstersDefeated: state.lastRound.monstersDefeated,
        totalMonsters: state.lastRound.totalMonsters,
        currentMonsterName: state.lastRound.currentMonsterName,
        currentMonsterIsBoss: state.lastRound.currentMonsterIsBoss,
        monsterJustKilled: state.lastRound.monsterJustKilled,
        partyHeroes: state.lastRound.partyHeroes,
      }
    : null;

  const floorProgress = {
    monstersDefeated: state.monstersDefeated,
    totalMonsters: state.totalMonsters,
    currentMonsterName: currentMonster?.data.name ?? "Unknown",
    currentMonsterIsBoss: currentMonster?.data.isBoss ?? false,
  };

  // Build battle log from current round (weapon types default to "melee";
  // the client overrides weaponType for the local player from its own hero data)
  const events: CombatEventView[] = buildEvents(state.lastRound);

  const view: CombatViewState = {
    inCombat,
    finished,
    floorCompleted: state.floorCompleted,
    floorFailed: state.floorFailed,
    partyCombat,
    monsters,
    round,
    events,
    floorProgress,
  };

  if (finished) {
    view.result = {
      heroWon: state.floorCompleted,
      totalRounds: state.lastRound?.round ?? 0,
      goldEarned: state.totalGoldRewarded,
      goldLost: state.floorFailed ? state.floorGoldValue : 0,
      monstersDefeated: state.monstersDefeated,
      totalMonsters: state.totalMonsters,
      shardsEarned: state.shardsEarned,
    };
  }

  return view;
}

function buildEvents(
  lastRound: CombatRoundState | null,
  playerHero?: { id: string; equipped: Record<string, unknown> | null },
): CombatEventView[] {
  if (!lastRound || !lastRound.partyHeroes) return [];

  const events: CombatEventView[] = [];

  for (const h of lastRound.partyHeroes) {
    if (h.damage > 0) {
      const wType =
        playerHero && h.heroId === playerHero.id
          ? ((playerHero.equipped?.rightHandWeapon as { type?: string } | undefined)?.type || "melee")
          : "melee";
      events.push({
        type: "hero_attack",
        heroId: h.heroId,
        damage: Math.round(h.damage),
        crit: h.crit,
        weaponType: wType,
        role: h.role,
        monsterName: lastRound.currentMonsterName,
      });
      }
      if (h.healingDone > 0) {
        events.push({
          type: "heal_cast",
          heroId: h.heroId,
          healAmount: Math.round(h.healingDone),
        });
      }
      if (h.healingReceived > 0) {
        events.push({
          type: "healed",
          heroId: h.heroId,
          healAmount: Math.round(h.healingReceived),
        });
      }
      if (h.damageTaken > 0) {
      events.push({
        type: "hero_hit",
        heroId: h.heroId,
        damage: Math.round(h.damageTaken),
        crit: h.monsterCrit,
        monsterName: lastRound.currentMonsterName,
      });
        if (h.role === "tank") {
          events.push({
            type: "block",
            heroId: h.heroId,
            damage: Math.round(h.damageTaken),
          });
        }
      }
      if (!h.alive) {
        events.push({
          type: "hero_death",
          heroId: h.heroId,
        });
      }
    }
    if (lastRound.monsterJustKilled) {
      events.push({ type: "monster_death", monsterName: lastRound.currentMonsterName });
    }

  return events;
}

export const combatSerializer = {
  toView,
  buildEvents,
};
