
export interface Villain {
  hp: number;
  maxHp: number;
}

export const enum BattleStatus {
  READY = 'READY',
  ONGOING = 'ONGOING',
  FINISHED = 'FINISHED',
}

export interface Battle {
  status: BattleStatus;
  epicness: number;
  tronium: number;
  villain: Villain;
}

export interface FightStats {
  playerName: string;
  epicness: number;
  troniums: number;
}

export interface PlayerStats {
  bestFightByEpicness: FightStats;
  bestFightByTroniums: FightStats;
  villainsDefeated: number;
}

export interface GlobalStats {
  allTimeByEpicness: FightStats[]; // sorted by epicness descending
  allTimeByTroniunm: FightStats[]; // sorted by tronium descending
  villainsDefeated: number; // total
  bestFightWeekByEpicness: FightStats;
  bestFightWeekByTroniunm: FightStats;
}
