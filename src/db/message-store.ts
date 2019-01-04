import db from '../connections/postgres';
import { MessageType, MessagePlayerOpened, MessageDealerAccepted, MessagePlayerClosed } from '../model/message';
import { Address } from '../tron/types';

export function fromPG(record: any): MessagePlayerOpened | MessageDealerAccepted | MessagePlayerClosed {
  const obj = record.text;
  switch(obj.type) {
    case MessageType.PLAYER_OPENED: {
      return {
        playerAddress: record.player_address,
        channelId: record.channel_id,
        round: record.round,
        publicKey: record.public_key,
        type: record.type,
        bet: obj.bet,
        player: obj.player,
        playerRandomHash1: obj.playerRandomHash1,
        playerRandomHash2: obj.playerRandomHash2,
        playerRandomHash3: obj.playerRandomHash3,
        signature: obj.signature
      };
    }
    case MessageType.DELEAR_ACCEPTED: {
      return {
        messagePlayerOpened: obj.messagePlayerOpened,
        type: obj.type,
        dealerRandomNumber1: obj.dealerRandomNumber1,
        dealerRandomNumber2: obj.dealerRandomNumber2,
        dealerRandomNumber3: obj.dealerRandomNumber3,
        signature: obj.signature
      };
    }
    case MessageType.PLAYER_CLOSED: {
      return {
        messageDealerAccepted: obj.messageDealerAccepted,
        type: obj.type,
        playerUpdated: obj.playerUpdated,
        playerRandomNumber1: obj.playerRandomNumber1,
        playerRandomNumber2: obj.playerRandomNumber2,
        playerRandomNumber3: obj.playerRandomNumber3,
        signature: obj.signature
      };
    }
    default: throw("Unrecognized message type");
  }
}

export async function getLastMessage(playerAddress: Address): Promise<null | MessagePlayerOpened | MessageDealerAccepted | MessagePlayerClosed> {
  const res = await db.oneOrNone<any>(
    'select * from messages where player_address = $(playerAddress) order by created_date desc limit 1',
    {
      playerAddress,
    }
  );
  return res != null ? fromPG(res) : null;
}

export function insertMessage(
  playerAddress: Address,
  channelId: number,
  round: number,
  type: string,
  text: string
): Promise<boolean> {
  return db.result(
    `INSERT INTO messages(
      player_address,
      channel_id,
      round,
      type,
      text
     ) VALUES (
       $(playerAddress),
       $(channelId),
       $(round),
       $(type),
       $(text)
     ) ON CONFLICT DO NOTHING`,
    {
      playerAddress,
      channelId,
      round,
      type,
      text
    },
    cb => cb.rowCount === 1
  );
}
