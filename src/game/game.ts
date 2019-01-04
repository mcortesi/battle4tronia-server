import { Winnings } from './reels';
import { Battle, BattleStatus } from '../model/battle';
import { Address } from '../tron/types';
import { Bet } from '../model/bet';
import { Player } from '../model/player';
import * as tronUtils from '../tron/utils';
import * as abi from 'ethereumjs-abi';

export function createRandom(playerRandom: number, dealerRandomNumber: number): number {
  return (playerRandom + dealerRandomNumber) / (2 * 10000);
}

export function updatePlayer(player: Player, bet: Bet, winnings: Winnings): Player {
  const betCost = bet.lines * bet.tronium * bet.level;

  player.tronium += winnings.payout - betCost;
  player.fame += winnings.epicness;

  return player;
}

export function updateBattle(battle: Battle, bet: Bet, winnings: Winnings): Battle {
  const betCost = bet.lines * bet.tronium * bet.level;

  battle.tronium += winnings.payout;
  battle.epicness += winnings.epicness;
  battle.villain.hp = Math.max(battle.villain.hp - winnings.damage, 0);
  battle.status = battle.villain.hp <= 0 ? BattleStatus.FINISHED : BattleStatus.ONGOING;

  return battle;
}

export function getOpenBetMessageHash(
  battleForTroniaAddress: Address,
  playerAddress: Address,
  playerTronium: number,
  channelId: number,
  round: number,
  publicKey: Address,
  betLevel: number,
  betTronium: number,
  betLines: number,
  playerRandomHashes: Buffer
): Buffer {
  return abi.soliditySHA256(
    [
      'address',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'bytes32'
    ],
    [
      tronUtils.addressToEVMAddress(battleForTroniaAddress),
      tronUtils.addressToEVMAddress(playerAddress),
      playerTronium,
      channelId,
      round,
      tronUtils.addressToEVMAddress(publicKey),
      betLevel,
      betTronium,
      betLines,
      playerRandomHashes
    ]
  );
}


export function getPlayerRandomHash(
  playerRandomHash1_v: number,
  playerRandomHash1_r: string,
  playerRandomHash1_s: string,
  playerRandomHash2_v: number,
  playerRandomHash2_r: string,
  playerRandomHash2_s: string,
  playerRandomHash3_v: number,
  playerRandomHash3_r: string,
  playerRandomHash3_s: string,
): Buffer {
  return abi.soliditySHA256(
    [
      'uint8',
      'bytes32',
      'bytes32',
      'uint8',
      'bytes32',
      'bytes32',
      'uint8',
      'bytes32',
      'bytes32'
    ],
    [
      playerRandomHash1_v,
      Buffer.from(playerRandomHash1_r, 'hex'),
      Buffer.from(playerRandomHash1_s, 'hex'),
      playerRandomHash2_v,
      Buffer.from(playerRandomHash2_r, 'hex'),
      Buffer.from(playerRandomHash2_s, 'hex'),
      playerRandomHash3_v,
      Buffer.from(playerRandomHash3_r, 'hex'),
      Buffer.from(playerRandomHash3_s, 'hex')
    ]
  );
}

export function getAcceptedBetMessageHash(
  battleForTroniaAddress: Address,
  playerAddress: Address,
  playerTronium: number,
  channelId: number,
  round: number,
  publicKey: Address,
  betLevel: number,
  betTronium: number,
  betLines: number,
  playerRandomHashes: Buffer,
  delearNumberHashes: Buffer
): Buffer {
  return abi.soliditySHA256(
    [
      'address',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'bytes32',
      'bytes32'
    ],
    [
      tronUtils.addressToEVMAddress(battleForTroniaAddress),
      tronUtils.addressToEVMAddress(playerAddress),
      playerTronium,
      channelId,
      round,
      tronUtils.addressToEVMAddress(publicKey),
      betLevel,
      betTronium,
      betLines,
      playerRandomHashes,
      delearNumberHashes
    ]
  );
}

export function getDelearNumberHash(
  random1: number,
  random2: number,
  random3: number
): Buffer {
  return abi.soliditySHA256(
    [
      'uint256',
      'uint256',
      'uint256',
    ],
    [
      random1,
      random2,
      random3
    ]
  );
}

export function getCloseMessageHash(battleForTroniaAddress: Address, playerAddress: Address, channelId: number, tronium: number): Buffer {
  return abi.soliditySHA256(
    ['address', 'address', 'uint8', 'uint256', 'uint256'],
    [
      tronUtils.addressToEVMAddress(battleForTroniaAddress),
      tronUtils.addressToEVMAddress(playerAddress),
      1,
      channelId,
      tronium
    ]
  );
}

export function getCloseAndOpenMessageHash(battleForTroniaAddress: Address, playerAddress: Address, channelId: number, tronium: number, publicKey: Address): Buffer {
  return abi.soliditySHA256(
    ['address', 'address', 'uint8', 'uint256', 'uint256', 'address'],
    [
      tronUtils.addressToEVMAddress(battleForTroniaAddress),
      tronUtils.addressToEVMAddress(playerAddress),
      2,
      channelId,
      tronium,
      tronUtils.addressToEVMAddress(publicKey)
    ]
  );
}
