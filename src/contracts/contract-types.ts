import { Address, TxHash } from '../tron/types';
import { CallOpts } from '../tron/contract';

export interface BattleForTronia {
  //Address
  address: Address;

  openChannel(publicKey: Address, opts?: CallOpts): Promise<TxHash>;

}
