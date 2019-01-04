
import { Address } from '../tron/types';
import { Player } from './player';
import { Bet } from './bet';

export const enum MessageType {
  PLAYER_OPENED = 'PLAYER_OPENED',
  DELEAR_ACCEPTED = 'DELEAR_ACCEPTED',
  PLAYER_CLOSED = 'PLAYER_CLOSED',
}

export interface Message {
  playerAddress: Address;
  channelId: number;
  round: number;
  publicKey: string;
  type: MessageType;
}

export interface Signature {
  r: string;
  s: string;
  v: number
}

export interface Signed {
  signature: Signature;
}

export interface MessagePlayerOpened extends Message, Signed {
  bet: Bet;
  player: Player;
  playerRandomHash1: Signature;
  playerRandomHash2: Signature;
  playerRandomHash3: Signature;
}

export interface MessageDealerAccepted extends Signed {
  messagePlayerOpened: MessagePlayerOpened;
  dealerRandomNumber1: number;
  dealerRandomNumber2: number;
  dealerRandomNumber3: number;
  type: MessageType;
}

export interface MessagePlayerClosed extends Signed {
  messageDealerAccepted: MessageDealerAccepted;
  playerUpdated: Player;
  playerRandomNumber1: number;
  playerRandomNumber2: number;
  playerRandomNumber3: number;
  type: MessageType;
}
