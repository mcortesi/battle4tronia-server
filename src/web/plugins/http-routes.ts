import { FastifyInstance } from 'fastify';
import { contracts, getDealer } from '../../config';
import * as playerStore from '../../db/player-store';
import * as messageStore from '../../db/message-store';
import * as channelStore from '../../db/channel-store';
import * as battleStore from '../../db/battle-store';
import * as wallet from '../../utils/wallet';
import * as tronUtils from '../../tron/utils';
import * as game from '../../game/game';
import { Move, winningsFor } from '../../game/reels';
import { BattleStatus } from '../../model/battle';
import { MessagePlayerOpened, MessageDealerAccepted, MessagePlayerClosed, MessageType } from '../../model/message';

export default async function setup(fastify: FastifyInstance) {
  fastify.get(
    '/player/:playerAddress',
    {
      schema: {
        params: {
          playerAddress: { type: 'string' },
        },
      },
    },
    async (req, reply) => {
      return playerStore.getPlayer(req.params.playerAddress);
    }
  );

  fastify.get(
    '/battle/:playerAddress',
    {
      schema: {
        params: {
          playerAddress: { type: 'string' },
        },
      },
    },
    async (req, reply) => {
      return battleStore.getCurrentBattle(req.params.playerAddress);
    }
  );


  fastify.get(
      '/message/:playerAddress',
      {
        schema: {
          params: {
            playerAddress: { type: 'string' },
          },
        },
      },
      async (req, reply) => {
        return messageStore.getLastMessage(req.params.playerAddress);
      }
    );

  //TODO: add signature for player?
  fastify.put(
    '/player/:playerAddress',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'name'
          ],
          properties: {
            name: { type: 'string' }
          },
        },
      },
    },
    async (req, reply) => {
      const ok = await playerStore.updatePlayerName(req.params.playerAddress, req.body.name);
      if(ok) {
        const player = await playerStore.getPlayer(req.params.playerAddress);
        return reply.send(player);
      }
      else {
        return reply.status(500).send("Error updating player name");
      }
    }
  );

  fastify.post(
    '/message/opened',
    {
      schema: {
        body: {
          definitions: {
            signature: {
              type: 'object',
              required: [
                'r',
                's',
                'v'
              ],
              properties: {
                r: { type: 'string' },
                s: { type: 'string' },
                v: { type: 'number' },
              },
            },
            bet: {
              type: 'object',
              required: [
                'level',
                'tronium',
                'lines'
              ],
              properties: {
                level: { type: 'number' },
                tronium: { type: 'number' },
                lines: { type: 'number' },
              },
            },
            player: {
              type: 'object',
              required: [
                'name',
                'tronium',
                'fame',
              ],
              properties: {
                name: { type: 'string' },
                tronium: { type: 'number' },
                fame: { type: 'number' },
              },
            }
          },
          type: 'object',
          required: [
            'playerAddress',
            'channelId',
            'round',
            'publicKey',
            'bet',
            'player',
            'playerRandomHash1',
            'playerRandomHash2',
            'playerRandomHash3',
            'signature'
          ],
          properties: {
            playerAddress: { type: 'string' },
            channelId: { type: 'number' },
            round: { type: 'number' },
            publicKey: { type: 'string' },
            bet: { "$ref": "#/definitions/bet" },
            player: { "$ref": "#/definitions/player" },
            playerRandomHash1: { "$ref": "#/definitions/signature" },
            playerRandomHash2: { "$ref": "#/definitions/signature" },
            playerRandomHash3: { "$ref": "#/definitions/signature" },
            signature: { "$ref": "#/definitions/signature" }
          },
        },
      },
    },
    async (req, reply) => {

      const messagePlayerOpened: MessagePlayerOpened = req.body;
      const playerSignature = messagePlayerOpened.signature;
      //Removes player signature
      delete messagePlayerOpened.signature;

      //Check valid signature
      const battleForTroniaAddress = contracts().battleForTronia;
      const hashOpened = game.getOpenBetMessageHash(
        battleForTroniaAddress,
        messagePlayerOpened.playerAddress,
        messagePlayerOpened.player.tronium,
        messagePlayerOpened.channelId,
        messagePlayerOpened.round,
        messagePlayerOpened.publicKey,
        messagePlayerOpened.bet.level,
        messagePlayerOpened.bet.tronium,
        messagePlayerOpened.bet.lines,
        game.getPlayerRandomHash(
          messagePlayerOpened.playerRandomHash1.v,
          messagePlayerOpened.playerRandomHash1.r,
          messagePlayerOpened.playerRandomHash1.s,
          messagePlayerOpened.playerRandomHash2.v,
          messagePlayerOpened.playerRandomHash2.r,
          messagePlayerOpened.playerRandomHash2.s,
          messagePlayerOpened.playerRandomHash3.v,
          messagePlayerOpened.playerRandomHash3.r,
          messagePlayerOpened.playerRandomHash3.s
        )
      );

      const signerEVMAddress = wallet.recoverSignatureAddressFromHash(hashOpened, playerSignature);
      const signerAddress = tronUtils.EVMAddressToAddress(signerEVMAddress);

      //Adds player signature back
      messagePlayerOpened.signature = playerSignature;
      if(signerAddress !== messagePlayerOpened.publicKey) {
        return reply.status(400).send("Invalid message signature");
      }

      //Check data valid
      const player = await playerStore.getPlayer(messagePlayerOpened.playerAddress)
      if(!player) {
        return reply.status(400).send("Player not found");
      }
      if(
        player.tronium != messagePlayerOpened.player.tronium ||
        player.fame != messagePlayerOpened.player.fame
      ){
        return reply.status(400).send("Invalid player data");
      }

      //Check data valid
      const channel = await channelStore.getCurrentChannel(messagePlayerOpened.playerAddress)
      if(!channel) {
        return reply.status(400).send("No channel opened");
      }
      if(
        channel.channelId != messagePlayerOpened.channelId ||
        channel.publicKey != messagePlayerOpened.publicKey
      ){
        return reply.status(400).send("Invalid channel data");
      }

      //7) check if correct correct correct round
      //TODO


      //8) check if enough money for bet
      const betCost = messagePlayerOpened.bet.lines * messagePlayerOpened.bet.tronium * messagePlayerOpened.bet.level;
      if(player.tronium < betCost) {
        return reply.status(400).send("Not enough tronium for the bet");
      }

      //Update player
      await playerStore.updatePlayerTronium(
        messagePlayerOpened.playerAddress,
        player.tronium - betCost
      );

      let ok;

      //Save message
      ok = await messageStore.insertMessage(
        messagePlayerOpened.playerAddress,
        messagePlayerOpened.channelId,
        messagePlayerOpened.round,
        MessageType.PLAYER_OPENED,
        JSON.stringify(messagePlayerOpened)
      );

      if(!ok) {
        return reply.status(500).send("Internal error");
      }

      //Generate random number
      const random1 = Math.random() * 10000;
      const random2 = Math.random() * 10000;
      const random3 = Math.random() * 10000;
      const messageToSign = {
        messagePlayerOpened: messagePlayerOpened,
        type: MessageType.DELEAR_ACCEPTED,
        dealerRandomNumber1: random1,
        dealerRandomNumber2: random2,
        dealerRandomNumber3: random3
      };


      const hashAccepted = game.getAcceptedBetMessageHash(
        battleForTroniaAddress,
        messagePlayerOpened.playerAddress,
        messagePlayerOpened.player.tronium,
        messagePlayerOpened.channelId,
        messagePlayerOpened.round,
        messagePlayerOpened.publicKey,
        messagePlayerOpened.bet.level,
        messagePlayerOpened.bet.tronium,
        messagePlayerOpened.bet.lines,
        game.getPlayerRandomHash(
          messagePlayerOpened.playerRandomHash1.v,
          messagePlayerOpened.playerRandomHash1.r,
          messagePlayerOpened.playerRandomHash1.s,
          messagePlayerOpened.playerRandomHash2.v,
          messagePlayerOpened.playerRandomHash2.r,
          messagePlayerOpened.playerRandomHash2.s,
          messagePlayerOpened.playerRandomHash3.v,
          messagePlayerOpened.playerRandomHash3.r,
          messagePlayerOpened.playerRandomHash3.s
        ),
        game.getDelearNumberHash(
          messageToSign.dealerRandomNumber1,
          messageToSign.dealerRandomNumber2,
          messageToSign.dealerRandomNumber3
        )
      );

      const signature = wallet.signHash(hashAccepted, getDealer().private);

      const signedMessage: MessageDealerAccepted = Object.assign( messageToSign, {
        signature: signature
      });

      //Save message
      ok = await messageStore.insertMessage(
        messagePlayerOpened.playerAddress,
        messagePlayerOpened.channelId,
        messagePlayerOpened.round,
        MessageType.DELEAR_ACCEPTED,
        JSON.stringify(signedMessage)
      );

      if(!ok) {
        return reply.status(500).send("Internal error");
      }

      return reply.send(JSON.stringify(signedMessage));
    }
  );


  fastify.post(
    '/message/closed',
    {
      schema: {
        body: {
          definitions: {
            signature: {
              type: 'object',
              required: [
                'r',
                's',
                'v'
              ],
              properties: {
                r: { type: 'string' },
                s: { type: 'string' },
                v: { type: 'number' },
              },
            },
            player: {
              type: 'object',
              required: [
                'name',
                'tronium',
                'fame',
              ],
              properties: {
                name: { type: 'string' },
                tronium: { type: 'number' },
                fame: { type: 'number' },
              },
            }
          },
          type: 'object',
          required: [
            'messageDealerAccepted',
            'playerUpdated',
            'playerRandomNumber1',
            'playerRandomNumber2',
            'playerRandomNumber3',
            'signature'
          ],
          properties: {
            messageDealerAccepted: { },
            playerUpdated: { "$ref": "#/definitions/player" },
            playerRandomNumber1: { type: 'number' },
            playerRandomNumber2: { type: 'number' },
            playerRandomNumber4: { type: 'number' },
            signature: { "$ref": "#/definitions/signature" }
          },
        },
      },
    },
    async (req, reply) => {

      const messagePlayerClosed: MessagePlayerClosed = req.body;

      const lastMessage = await messageStore.getLastMessage(messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.playerAddress)
      if(!lastMessage || lastMessage.type !== MessageType.DELEAR_ACCEPTED) {
        return reply.status(400).send("No bet opened");
      }

      //Check signature
      const playerSignature = messagePlayerClosed.signature;
      //Removes player signature
      delete messagePlayerClosed.signature;

      //Check valid signature
      const signerEVMAddress = wallet.recoverSignatureAddress(JSON.stringify(messagePlayerClosed), playerSignature);
      const signerAddress =tronUtils.EVMAddressToAddress(signerEVMAddress);

      //Adds player signature back
      messagePlayerClosed.signature = playerSignature;
      if(signerAddress !== messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.publicKey) {
        return reply.status(400).send("Invalid message signature");
      }

      //Check signed correct message
      if(JSON.stringify(lastMessage) !== JSON.stringify(messagePlayerClosed.messageDealerAccepted)) {
        return reply.status(400).send("Invalid dealear accepted message");
      }

      //Get current battle
      const battle = await battleStore.getCurrentBattle(messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.playerAddress);
      if(!battle) {
        return reply.status(400).send("No battle for this player");
      }

      let finalRandom1: number;
      let finalRandom2: null | number = null;
      let finalRandom3: null | number = null;
      const lineResults: number[] = [];

      const bet = messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.bet;

      finalRandom1 = game.createRandom(messagePlayerClosed.playerRandomNumber1, messagePlayerClosed.messageDealerAccepted.dealerRandomNumber1);
      lineResults.push(finalRandom1);

      if(bet.lines > 1) {
        finalRandom2 = game.createRandom(messagePlayerClosed.playerRandomNumber2, messagePlayerClosed.messageDealerAccepted.dealerRandomNumber2);
        lineResults.push(finalRandom2);
      }
      if(bet.lines > 2) {
        finalRandom3 = game.createRandom(messagePlayerClosed.playerRandomNumber3, messagePlayerClosed.messageDealerAccepted.dealerRandomNumber3);
        lineResults.push(finalRandom3);
      }

      const winnings = winningsFor(bet, lineResults.map(x => Move.fromDice(x)));
      let playerUpdated = game.updatePlayer(
        messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.player,
        bet,
        winnings
      );
      let battleUpdated = game.updateBattle(
        battle,
        bet,
        winnings
      );

      //Update player
      await playerStore.updatePlayerFameAndTronium(
        messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.playerAddress,
        playerUpdated.tronium,
        playerUpdated.fame
      );

      //Update battle
      await battleStore.updateBattle(
        messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.playerAddress,
        battleUpdated.tronium,
        battleUpdated.epicness,
        battleUpdated.villain.hp,
        battleUpdated.status
      );

      //If battle finished create new battle
      if(battleUpdated.status === BattleStatus.FINISHED) {
        const ok = await battleStore.createBattle(
          messagePlayerClosed.messageDealerAccepted.messagePlayerOpened.playerAddress,
          playerUpdated.fame
        );
        if(!ok) {
          return reply.status(500).send("Error creating new battle");
        }
      }

      return reply.send(JSON.stringify({
        player: playerUpdated,
        battle: battleUpdated
      }));
    }
  );

  fastify.post(
    '/channel/close/:playerAddress',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'channelId',
            'tronium'
          ],
          properties: {
            channelId: { type: 'number' },
            tronium: { type: 'number' }
          },
        },
      },
    },
    async (req, reply) => {

      //Checks player data
      const player = await playerStore.getPlayer(req.params.playerAddress)
      if(!player) {
        return reply.status(400).send("Player not found");
      }
      if(
        player.tronium != req.body.tronium
      ){
        return reply.status(400).send("Invalid troniun amount");
      }

      //Check data valid
      const channel = await channelStore.getCurrentChannel(req.params.playerAddress)
      if(!channel) {
        return reply.status(400).send("No channel opened");
      }
      if(
        channel.channelId != req.body.channelId
      ){
        return reply.status(400).send("Invalid channel id");
      }

      //Creates signed message
      const battleForTroniaAddress = contracts().battleForTronia;
      const hash = game.getCloseMessageHash(
        battleForTroniaAddress,
        req.params.playerAddress,
        req.body.channelId,
        req.body.tronium
      );
      const signature = wallet.signHash(hash, getDealer().private);

      return reply.send(JSON.stringify(signature));
    }
  );

  fastify.post(
    '/channel/closeopen/:playerAddress',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'channelId',
            'tronium',
            'publicKey'
          ],
          properties: {
            channelId: { type: 'number' },
            tronium: { type: 'number' },
            publicKey: { type: 'string' }
          },
        },
      },
    },
    async (req, reply) => {

      //Checks player data
      const player = await playerStore.getPlayer(req.params.playerAddress)
      if(!player) {
        return reply.status(400).send("Player not found");
      }

      //Check data valid
      const channel = await channelStore.getCurrentChannel(req.params.playerAddress)
      if(!channel) {
        return reply.status(400).send("No channel opened");
      }
      if(
        channel.channelId != req.body.channelId
      ){
        return reply.status(400).send("Invalid channel id");
      }

      if(
        player.tronium != req.body.tronium
      ){
        return reply.status(400).send("Invalid troniun amount");
      }

      //Creates signed message
      const battleForTroniaAddress = contracts().battleForTronia;
      const hash = game.getCloseAndOpenMessageHash(
        battleForTroniaAddress,
        req.params.playerAddress,
        req.body.channelId,
        req.body.tronium,
        req.body.publicKey
      );
      const signature = wallet.signHash(hash, getDealer().private);

      return reply.send(JSON.stringify(signature));
    }
  );

  fastify.get(
    '/stats/global',
    async (req, reply) => {
      return {
        allTimeByEpicness: await battleStore.getAllTimeByEpicness(),
        allTimeByTroniunm: await battleStore.getAllTimeByTronium(),
        villainsDefeated: await battleStore.getAllVillainsDefeated(),
        bestFightWeekByEpicness: await battleStore.getBestFightWeekByEpicness(),
        bestFightWeekByTroniunm: await battleStore.getBestFightWeekByTroniunm()
      }
    }
  );

  fastify.get(
    '/stats/player/:playerAddress',
    {
      schema: {
        params: {
          playerAddress: { type: 'string' },
        },
      },
    },
    async (req, reply) => {
      return {
        bestFightByEpicness: await battleStore.getPlayerBestFightByEpicness(req.params.playerAddress),
        bestFightByTroniums: await battleStore.getPlayerBestFightByTronium(req.params.playerAddress),
        villainsDefeated: await battleStore.getPlayerVillainsDefeated(req.params.playerAddress)
      }
    }
  );
}
