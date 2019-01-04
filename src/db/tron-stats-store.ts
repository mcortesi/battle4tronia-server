import BN from 'bn.js';
import db from '../connections/postgres';

const BlockSpacing = 3000; // 3 seconds between each block

export async function currentBlockNumber(): Promise<BN> {
  const res = await db.oneOrNone<any>(
    'select number from block_stat'
  );
  return res != null ? new BN(res.number) : new BN(0);
}

export async function currentBlockHash(): Promise<string> {
  const res = await db.oneOrNone<any>(
    'select hash from block_stat'
  );
  return res.hash;
}

export async function currentBlockTimestamp(): Promise<number> {
  const res = await db.oneOrNone<any>(
    'select timestamp from block_stat'
  );
  return Number(res.timestamp);
}

export async function expectedBlockNumberIn(ms: number) {
  const blockNumber = await currentBlockNumber();
  return blockNumber.addn(Math.ceil(ms / BlockSpacing));
}


export async function updateCurrentBlock(stats: {
  blockNumber: number;
  hash: string;
  timestamp: number;
}): Promise<boolean> {
  return db.result(
    `DELETE FROM block_stat; INSERT INTO block_stat(
      number,
      hash,
      timestamp
     ) VALUES (
       $(blockNumber),
       $(hash),
       $(timestamp)
     ) ON CONFLICT DO NOTHING`,
    stats,
    cb => cb.rowCount === 1
  );
}
