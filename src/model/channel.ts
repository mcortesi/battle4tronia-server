
import { Address } from '../tron/types';

export interface Channel {
  playerAddress: Address;
  channelId: number;
  publicKey: string;
}
