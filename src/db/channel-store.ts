import db from '../connections/postgres';
import { Channel } from '../model/channel';
import { Address } from '../tron/types';

export function fromPG(record: any): Channel {
  return {
    playerAddress: record.player_address,
    channelId: record.channel_id,
    publicKey: record.public_key
  };
}

export async function getCurrentChannel(playerAddress: Address): Promise<null | Channel> {
  const res = await db.oneOrNone<any>(
    `select * from channels where player_address = $(playerAddress) and state = 'Opened' order by channel_id desc limit 1`,
    {
      playerAddress,
    }
  );
  return res != null ? fromPG(res) : null;
}

export function insertChannel(
  playerAddress: Address,
  channelId: number,
  publicKey: string,
  tronium: string
): Promise<boolean> {
  return db.result(
    `INSERT INTO channels(
      player_address,
      channel_id,
      public_key,
      tronium,
      state
     ) VALUES (
       $(playerAddress),
       $(channelId),
       $(publicKey),
       $(tronium),
       'Opened'
     ) ON CONFLICT DO NOTHING`,
    {
      playerAddress,
      channelId,
      publicKey,
      tronium
    },
    cb => cb.rowCount === 1
  );
}

export async function closeChannel(
  playerAddress: Address
): Promise<boolean> {
  return await db.result(
    `UPDATE channels SET
        state = 'Closed',
        updated_date = current_timestamp
      WHERE player_address=$(playerAddress)`,
    {
      playerAddress
    },
    cb => cb.rowCount === 1
  );
}
