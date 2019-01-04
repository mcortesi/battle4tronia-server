import TWeb from '../tron/tweb';
import { getNodeUri, getABI, contracts } from '../config';
import { logger as rootLogger } from '../utils/logger';
import { pollDifferences } from '../utils/rx';
import { concatMap } from 'rxjs/operators';
import { updateCurrentBlock } from '../db/tron-stats-store';
import { Block, Address, TransactionRaw, ContractResult } from '../tron/types';
import { ContractTxAnalyzer } from '../tron/contract';
import * as playerStore from '../db/player-store';
import * as channelStore from '../db/channel-store';
import * as battleStore from '../db/battle-store';

const logger = rootLogger.child({ srv: 'tronwatcher' });

export function tronWatcher() {
  const { full, solidity } = getNodeUri();
  const BattleForTroniaAddress = contracts().battleForTronia;
  const tweb = new TWeb(full, solidity);
  const contractProcessor = new ContractProcessor(tweb, BattleForTroniaAddress);

  const newBlocks$ = pollDifferences({
    period: 1000,
    poller: () => tweb.getNowBlock(),
    compareFn: (prev, after) => prev.blockID === after.blockID,
  });

  const blockUpdates$ = newBlocks$.pipe(
    concatMap(async block => {
      logger.info(
        'new block %s (number: %d, txs: %d)',
        block.blockID,
        block.blockHeader.number,
        block.transactions.length
      );
      await updateCurrentBlock({
        blockNumber: block.blockHeader.number,
        hash: block.blockID,
        timestamp: block.blockHeader.timestamp,
      });
      await contractProcessor.processBlock(block);
    })
  );

  return blockUpdates$;
}

class ContractProcessor {
  contractAnalyzer: ContractTxAnalyzer;
  constructor(private tweb: TWeb, battleForTroniaAddress: Address) {
    this.contractAnalyzer = new ContractTxAnalyzer(getABI('BattleForTronia'), battleForTroniaAddress);
  }

  async processBlock(block: Block) {
    for (const tx of block.transactions) {
      // check if it's a trade and decode it
      const called = this.hasBeenCalled(tx);
      if (called) {
        await this.waitForTrade(tx.txID);
      }
    }
  }

  hasBeenCalled(tx: TransactionRaw): boolean {
    try {
      if (tx.ret == null || !this.contractAnalyzer.isContractTx(tx)) {
        return false;
      }
      const call = this.contractAnalyzer.decodeCall(tx);
      if (call.method === 'openChannel' || call.method === 'closeChannel' || call.method === 'closeAndOpenChannel') {
        logger.info('Found Contract call: %s, tx: %s sender: %s', call.method, tx.txID, call.sender);
        return true;
      } else {
        return false;
      }
    }
    catch {
      return false;
    }
  }

  async waitForTrade(txhash: string) {
    const txinfo = await this.tweb.waitForTx(txhash, 300000);

    if (!txinfo.receipt) {
      return {
        ok: false,
        executionDate: new Date(),
        energyUsed: 0,
      };
    }
    const energyUsed = txinfo.receipt.energy_usage_total;
    const log = this.contractAnalyzer
      .decodeTxEvents(txinfo)
      .find(log => log.name === 'ChannelOpened' || log.name === 'ChannelClosed' || log.name == 'ChannelCloseAndOpened');

    if (log != null && log.name === 'ChannelOpened' && txinfo.receipt.result === ContractResult.SUCCESS) {
      logger.info('ChannelOpened: tx: %s', txhash);

      const playerAddress = log.parameters[0];
      const channelId = log.parameters[1].toString();
      const tronium = log.parameters[2].toString();
      const publicKey = log.parameters[3];

      const player = await playerStore.getPlayer(playerAddress);

      let ok;

      if(!player) {
        //Insert player
        ok = await playerStore.insertPlayer(
          playerAddress,
          parseInt(tronium)
        );
      }
      else {
        ok = await playerStore.updatePlayerTronium(playerAddress, parseInt(tronium));
      }

      if(!ok) {
        return {
          ok: false
        }
      }

      ok = await channelStore.insertChannel(
        playerAddress,
        channelId,
        publicKey,
        tronium
      );

      //Insert channel
      if(!ok) {
        return {
          ok: false
        }
      }

      const currentBattle = await battleStore.getCurrentBattle(playerAddress);

      if(!currentBattle) {
        ok = await battleStore.createBattle(playerAddress, player? player.fame : 0);

        if(!ok) {
          return {
            ok: false
          }
        }
      }

      return {
        ok: true,
        executionDate: new Date(),
        energyUsed
      };
    }

    if (log != null && log.name === 'ChannelCloseAndOpened' && txinfo.receipt.result === ContractResult.SUCCESS) {
      logger.info('ChannelCloseAndOpened: tx: %s', txhash);

      const playerAddress = log.parameters[0];
      const channelId = log.parameters[1].toString();
      const tronium = log.parameters[2].toString();
      const publicKey = log.parameters[3];

      const player = await playerStore.getPlayer(playerAddress);

      await playerStore.updatePlayerTronium(playerAddress, parseInt(tronium));

      await channelStore.closeChannel(playerAddress);

      let ok = await channelStore.insertChannel(
        playerAddress,
        channelId,
        publicKey,
        tronium
      );

      //Insert channel
      if(!ok) {
        return {
          ok: false
        }
      }

      return {
        ok: true,
        executionDate: new Date(),
        energyUsed
      };

    }

    if (log != null && log.name === 'ChannelClosed' && txinfo.receipt.result === ContractResult.SUCCESS) {
      logger.info('ChannelClosed: tx: %s', txhash);

      const playerAddress = log.parameters[0];
      const channelId = log.parameters[1].toString();

      const channel = await channelStore.getCurrentChannel(playerAddress);
      if(channel && channel.channelId.toString() === channelId) {
        await channelStore.closeChannel(playerAddress);
        await playerStore.updatePlayerTronium(playerAddress, 0);
      }
    }
  }

}
