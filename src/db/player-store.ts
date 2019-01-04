import db from '../connections/postgres';
import { Player } from '../model/player';
import { Address } from '../tron/types';

export function fromPG(record: any): Player {
  return {
    name: record.name,
    fame: record.fame,
    tronium: record.tronium,
    collectables: record.collectables,
    item1: record.item1,
    item2: record.item2,
    item3: record.item3,
    item4: record.item4
  };
}

export async function getPlayer(playerAddress: Address): Promise<null | Player> {
  const res = await db.oneOrNone<any>(
    'select * from players where player_address = $(playerAddress)',
    {
      playerAddress,
    }
  );
  return res != null ? fromPG(res) : null;
}

export function insertPlayer(
  playerAddress: Address,
  tronium: number
): Promise<boolean> {
  const name = `player${Date.now()}`;
  return db.result(
    `INSERT INTO players(
      player_address,
      name,
      tronium
     ) VALUES (
       $(playerAddress),
       $(name),
       $(tronium)
     ) ON CONFLICT DO NOTHING`,
    {
      playerAddress,
      name,
      tronium
    },
    cb => cb.rowCount === 1
  );
}

export async function updatePlayerTronium(
  playerAddress: Address,
  tronium: number
): Promise<boolean> {
  return await db.result(
    `UPDATE players SET
        tronium = $(tronium),
        updated_date = current_timestamp
      WHERE player_address=$(playerAddress)`,
    {
      playerAddress,
      tronium
    },
    cb => cb.rowCount === 1
  );
}

export async function updatePlayerFameAndTronium(
  playerAddress: Address,
  tronium: number,
  fame: number
): Promise<boolean> {
  return await db.result(
    `UPDATE players SET
        tronium = $(tronium),
        fame = $(fame),
        updated_date = current_timestamp
      WHERE player_address=$(playerAddress)`,
    {
      playerAddress,
      tronium,
      fame
    },
    cb => cb.rowCount === 1
  );
}


export async function updatePlayerName(
  playerAddress: Address,
  name: string
): Promise<boolean> {
  return await db.result(
    `UPDATE players SET
        name = $(name),
        updated_date = current_timestamp
      WHERE player_address=$(playerAddress)`,
    {
      playerAddress,
      name
    },
    cb => cb.rowCount === 1
  );
}
