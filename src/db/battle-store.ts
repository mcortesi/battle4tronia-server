import db from '../connections/postgres';
import { Battle, BattleStatus, GlobalStats, PlayerStats, FightStats } from '../model/battle';
import { Address } from '../tron/types';

export function fromPG(record: any): Battle {
  return {
    status: record.status,
    epicness: record.epicness,
    tronium: record.tronium,
    villain: {
      hp: record.villain_hp,
      maxHp: record.villain_max_hp
    }
  };
}

export async function getCurrentBattle(playerAddress: Address): Promise<null | Battle> {
  const res = await db.oneOrNone<any>(
    `select * from battles where player_address = $(playerAddress) order by created_date desc limit 1`,
    {
      playerAddress,
    }
  );
  return res != null ? fromPG(res) : null;
}

export function insertBattle(
  playerAddress: Address,
  status: BattleStatus,
  epicness: number,
  tronium: number,
  hp: number,
  maxHp: number
): Promise<boolean> {
  return db.result(
    `INSERT INTO battles(
      player_address,
      villain_max_hp,
      villain_hp,
      epicness,
      tronium,
      status
     ) VALUES (
       $(playerAddress),
       $(maxHp),
       $(hp),
       $(epicness),
       $(tronium),
       $(status)
     ) ON CONFLICT DO NOTHING`,
    {
      playerAddress,
      maxHp,
      hp,
      epicness,
      tronium,
      status
    },
    cb => cb.rowCount === 1
  );
}

export function createBattle(
  playerAddress: Address,
  fame: number
): Promise<boolean> {
  const maxHP = fame < 1000 ? 100 : (fame < 10000? 150 : 200);
  return insertBattle(
    playerAddress,
    BattleStatus.READY,
    0,
    0,
    maxHP,
    maxHP
  );
}

export async function updateBattle(
  playerAddress: Address,
  tronium: number,
  epicness: number,
  villainHP: number,
  status: BattleStatus
): Promise<boolean> {
  return await db.result(
    `UPDATE battles SET
        tronium = $(tronium),
        epicness = $(epicness),
        villain_hp = $(villainHP),
        status = $(status),
        updated_date = current_timestamp
      WHERE player_address=$(playerAddress)
      and created_date = (select max(created_date) from battles where player_address=$(playerAddress));`,
    {
      playerAddress,
      tronium,
      epicness,
      villainHP,
      status
    },
    cb => cb.rowCount === 1
  );
}

function fightStatFromPG(record: any): FightStats {
  return {
    playerName: record.name,
    epicness: record.epicness,
    troniums: record.tronium
  };
}

export async function getAllTimeByEpicness(): Promise<FightStats[]> {
  const res = await db.manyOrNone(
    `select p.name, b.* from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    order by b.epicness desc limit 5`);
  return res != null ? res.map(fightStatFromPG) : [];
}

export async function getAllTimeByTronium(): Promise<FightStats[]> {
  const res = await db.manyOrNone(
    `select p.name, b.* from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    order by b.tronium desc limit 5`);
  return res != null ? res.map(fightStatFromPG) : [];
}

export async function getAllVillainsDefeated(): Promise<number> {
  const res = await db.one(
    `select count(*) from battles b
    where b.status = 'FINISHED'`);
  return parseInt(res.count);
}

export async function getBestFightWeekByEpicness(): Promise<null | FightStats> {
  const res = await db.oneOrNone(
    `select p.name, b.* from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    and b.created_date >= date_trunc('week', CURRENT_TIMESTAMP - interval '1 week')
    order by b.epicness desc limit 1`);
  return res != null ? fightStatFromPG(res) : null;
}

export async function getBestFightWeekByTroniunm(): Promise<null | FightStats> {
  const res = await db.oneOrNone(
    `select p.name, b.*  from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    and b.created_date >= date_trunc('week', CURRENT_TIMESTAMP - interval '1 week')
    order by b.tronium desc limit 1`);
  return res != null ? fightStatFromPG(res) : null;
}

export async function getPlayerBestFightByEpicness(playerAddress: Address): Promise<null | FightStats> {
  const res = await db.oneOrNone(
    `select p.name, b.* from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    and b.player_address=$(playerAddress)
    order by b.epicness desc limit 1`,
    {
      playerAddress,
    }
  );
  return res != null ? fightStatFromPG(res) : null;
}

export async function getPlayerBestFightByTronium(playerAddress: Address): Promise<null | FightStats> {
  const res = await db.oneOrNone(
    `select p.name, b.* from battles b
    inner join players p on b.player_address = p.player_address
    and b.status = 'FINISHED'
    and b.player_address=$(playerAddress)
    order by b.tronium desc limit 1`,
    {
      playerAddress,
    }
  );
  return res != null ? fightStatFromPG(res) : null;
}

export async function getPlayerVillainsDefeated(playerAddress: Address): Promise<number> {
  const res = await db.one(
    `select count(*) from battles b
    where b.status = 'FINISHED'
    and b.player_address=$(playerAddress) `,
    {
      playerAddress,
    }
  );
  return parseInt(res.count);
}
