import axios from 'axios';
import createDebugger from 'debug';
import {
  Account,
  AccountInfo,
  AssetToken,
  parseAccountInfo,
  parseAssetToken,
  TxHash,
  ResourceType,
  Address,
  parseTransactionInfo,
  TransactionInfo,
  parseBlock,
  Block,
  TransactionRaw,
} from './types';
import { addressToHex, utf8ToHex, ecsign } from './utils';

const debugHttp = createDebugger('tweb:http');

export default class TWeb {
  constructor(private apiUrl: string, private solidityUrl: string) {}

  async rpcCall(endpoint: string, payload?: any) {
    debugHttp('rpc call %s %O', endpoint, payload);
    const res = await axios.post(`${this.apiUrl}${endpoint}`, payload);
    if (res.status !== 200) {
      throw new Error(`HttpError: endpoint: ${endpoint} got ${res.status} - ${res.statusText}`);
    }
    debugHttp('rpc result %O', res.data);
    if (typeof res.data === 'object' && Object.keys(res.data).length === 0) {
      return null;
    }
    return res.data;
  }
  async solidityCall(endpoint: string, payload?: any) {
    debugHttp('solidity call %s %O', endpoint, payload);
    const res = await axios.post(`${this.solidityUrl}${endpoint}`, payload);
    if (res.status !== 200) {
      throw new Error(`HttpError: endpoint: ${endpoint} got ${res.status} - ${res.statusText}`);
    }
    debugHttp('solidity result %O', res.data);
    if (typeof res.data === 'object' && Object.keys(res.data).length === 0) {
      return null;
    }
    return res.data;
  }

  async executeTx(endpoint: string, payload: any, privateKey: string): Promise<TxHash> {
    let tx = await this.rpcCall(endpoint, payload);
    tx = tx.transaction ? tx.transaction : tx;

    if ('Error' in tx) {
      throw new Error(`TXError: ${tx.Error}`);
    }

    const signedTx = await this.signTransaction(tx, privateKey);
    await this.broadcastTransaction(signedTx);
    return tx.txID;
  }

  /**
   * Generate private keys and addresses online
   * @param null
   * @return {object}
   * */
  async generateAddress(): Promise<Account> {
    return this.rpcCall(`/wallet/generateaddress`);
  }

  /**
   * Get Account by address
   * @param {string} address
   * @return {object}
   **/
  async getAccount(address: Address): Promise<null | AccountInfo> {
    const res = await this.rpcCall('/wallet/getaccount', {
      address: addressToHex(address),
    });

    return res ? parseAccountInfo(res) : null;
  }

  /**
   * Query the latest block
   * @param null
   * @return {object}
   * */
  async getNowBlock(): Promise<Block> {
    return this.rpcCall(`/wallet/getnowblock`).then(parseBlock);
  }

  async getBlockById(blockHash: string) {
    return this.rpcCall('/wallet/getblockbyid', {
      value: blockHash,
    }).then(mb => (mb == null ? null : parseBlock(mb)));
  }
  async getBlockByNum(blockNumber: number): Promise<Block | null> {
    return this.rpcCall('/wallet/getblockbynum', {
      num: blockNumber,
    }).then(mb => (mb == null ? null : parseBlock(mb)));
  }

  /**
   * Query a transactional information by hash string of txId
   * params {string or number}
   * @return {object}
   */
  async getTransactionById(id: string) {
    return this.rpcCall('/wallet/gettransactionbyid', { value: id });
  }

  /**
   * Query a transactional information by hash string of txId
   * params {string or number}
   * @return {object}
   */
  async getTransactionInfoById(txhash: string): Promise<TransactionInfo | null> {
    const res = await this.rpcCall('/wallet/gettransactioninfobyid', {
      value: txhash,
    });
    return res ? parseTransactionInfo(res) : res;
  }

  /**
   * query all token list
   * @returns {Array}
   */
  async getAssetIssueList(): Promise<AssetToken[]> {
    const res = await this.rpcCall(`/wallet/getassetissuelist`);

    return res && res.assetIssue ? res.assetIssue.map(parseAssetToken) : [];
  }

  /**
   * query token list by page
   * @returns {Array}
   * */
  async getPaginateDassetIssueList(offset: number, limit: number) {
    return this.rpcCall(`/wallet/getpaginatedassetissuelist`, {
      offset,
      limit,
    });
  }

  /**
   * Check that the address is correct
   * @param {string hexString} address
   * @return {object}
   */
  async validateAddress(address: string) {
    return this.rpcCall(`${this.apiUrl}/wallet/validateaddress`, {
      address: addressToHex(address),
    });
  }

  /**
   * Query bandwidth information
   * @param {string} address
   * @return {object}
   * */
  async getAccountNet(address) {
    return this.rpcCall(`/wallet/getaccountnet`, {
      address: addressToHex(address),
    });
  }

  async getAccountResource(address) {
    return this.rpcCall('/wallet/getaccountresource', {
      address: addressToHex(address),
    });
  }

  /**
   * Deploy contract
   */
  async deployContract(opts: {
    abi: string;
    bytecode: string;
    parameter?: string;
    feeLimit: number;
    value?: number;
    from: Account;
    userResourcePercent?: number /* [0-100] */;
  }) {
    // constructor parameters are appended to the bytecode as in Ethereum

    return this.executeTx(
      `/wallet/deploycontract`,
      {
        abi: opts.abi,
        bytecode: opts.parameter ? opts.bytecode + opts.parameter : opts.bytecode,
        fee_limit: opts.feeLimit,
        call_value: opts.value || 0,
        owner_address: addressToHex(opts.from.address),
        consume_user_resource_percent: opts.userResourcePercent || 0,
      },
      opts.from.privateKey
    );
  }


    /**
     * Deploy contract
     */
    async deployContractV2(opts: {
      abi: string;
      bytecode: string;
      parameter?: string;
      feeLimit: number;
      originEnergyLimit: number;
      value?: number;
      from: Account;
      userResourcePercent?: number /* [0-100] */;
    }) {
      // constructor parameters are appended to the bytecode as in Ethereum

      return this.executeTx(
        `/wallet/deploycontract`,
        {
          abi: opts.abi,
          bytecode: opts.parameter ? opts.bytecode + opts.parameter : opts.bytecode,
          fee_limit: opts.feeLimit,
          origin_energy_limit: opts.originEnergyLimit,
          call_value: opts.value || 0,
          owner_address: addressToHex(opts.from.address),
          consume_user_resource_percent: opts.userResourcePercent || 0,
        },
        opts.from.privateKey
      );
    }

  async getContract(contractAddress: Address) {
    return await this.rpcCall(`/wallet/getcontract`, {
      value: addressToHex(contractAddress),
    });
  }

  async querySmartContract(opts: {
    contractAddress: Address;
    functionSelector: string;
    parameter?: string;
    from?: Account;
  }) {
    const payload: any = {
      contract_address: addressToHex(opts.contractAddress),
      function_selector: opts.functionSelector.replace(/\s*/g, ''),
      parameter: opts.parameter,
    };
    if (opts.from) {
      payload.owner_address = addressToHex(opts.from.address);
    }

    const res = await this.rpcCall(`/wallet/triggersmartcontract`, payload);
    if (
      res.result &&
      res.result.result &&
      res.constant_result &&
      res.constant_result.length === 1 &&
      res.constant_result[0] != ''
    ) {
      return res.constant_result;
    } else {
      throw new Error(`Invalid query contract result ${JSON.stringify(res)}`);
    }
  }

  async triggerSmartContract(opts: {
    contractAddress: Address;
    functionSelector: string;
    parameter?: string;
    callValue?: number;
    feeLimit: number;
    from: Account;
  }) {
    return await this.executeTx(
      `/wallet/triggersmartcontract`,
      {
        contract_address: addressToHex(opts.contractAddress),
        function_selector: opts.functionSelector.replace(/\s*/g, ''),
        parameter: opts.parameter,
        fee_limit: opts.feeLimit,
        call_value: opts.callValue,
        owner_address: addressToHex(opts.from.address),
      },
      opts.from.privateKey
    );
  }

  async signTransaction(tx: any, privateKey: string) {
    return this.localSignTransaction(tx, privateKey);
  }

  localSignTransaction(tx: TransactionRaw, privateKey: string): TransactionRaw {
    const signature = ecsign(tx.txID, privateKey);
    tx.signature = [signature];
    return tx;
    // const key2 = new ethers.SigningKey(privateKey);
    // const signature = remove0x(ethers.utils.joinSignature(key2.signDigest('0x' + tx.txID)));
    // return tx;
  }

  async remoteSignTransaction(tx: TransactionRaw, privateKey: string): Promise<TransactionRaw> {
    return this.rpcCall('/wallet/gettransactionsign', {
      transaction: tx,
      privateKey: privateKey,
    });
  }

  async broadcastTransaction(tx: any) {
    const broadcastRes = await this.rpcCall(`/wallet/broadcasttransaction`, tx);
    if (broadcastRes == null || broadcastRes.result !== true) {
      throw new Error(`Error BroadcastTransaction: ${JSON.stringify(broadcastRes)}`);
    }
  }

  /**
   * Create a transfer transaction,If the to address for the transfer does not exist, create the account on the blockchain
   */
  async createTransaction(toAddress: string, amount: number, opts: { from: Account }) {
    return this.executeTx(
      '/wallet/createtransaction',
      {
        to_address: addressToHex(toAddress),
        owner_address: addressToHex(opts.from.address),
        amount,
      },
      opts.from.privateKey
    );
  }

  /**
   * Change the account name (only once)
   * */
  async updateAccount(newName: string, opts: { from: Account }) {
    return this.executeTx(
      '/wallet/updateaccount',
      {
        account_name: utf8ToHex(newName),
        owner_address: addressToHex(opts.from.address),
      },
      opts.from.privateKey
    );
  }

  /**
   * Transfer an Asset Token
   */
  async transferAsset(opts: { from: Account; to: string; assetName: string; amount: number }) {
    return await this.executeTx(
      `/wallet/transferasset`,
      {
        owner_address: addressToHex(opts.from.address),
        to_address: addressToHex(opts.to),
        asset_name: utf8ToHex(opts.assetName),
        amount: opts.amount,
      },
      opts.from.privateKey
    );
  }

  /**
   * Participate in token issuance
   */
  async participateAssetIssue(opts: {
    to: string;
    assetName: string;
    amount: number;
    from: Account;
  }) {
    return this.executeTx(
      `${this.apiUrl}/wallet/participateassetissue`,
      {
        owner_address: addressToHex(opts.from.address),
        to_address: addressToHex(opts.to),
        asset_name: utf8ToHex(opts.assetName),
        amount: opts.amount,
      },
      opts.from.privateKey
    );
  }

  /**
   * Freeze TRX, gain bandwidth, gain voting rights, gain energy
   */
  async freezeBalance(
    amount: number,
    duration: number,
    resource: ResourceType,
    opts: { from: Account }
  ) {
    return this.executeTx(
      '/wallet/freezebalance',
      {
        owner_address: addressToHex(opts.from.address),
        frozen_balance: amount,
        frozen_duration: duration,
        resource,
      },
      opts.from.privateKey
    );
  }

  /**
   * The thawing of TRX that has ended the freeze will also lose the bandwidth and voting power that this part of TRX brings
   */
  async unfreezeBalance(resource: ResourceType, opts: { from: Account }) {
    return this.executeTx(
      '/wallet/unfreezebalance',
      {
        resource,
        owner_address: addressToHex(opts.from.address),
      },
      opts.from.privateKey
    );
  }

  /**
   * Create a new Token type (AssetToken)
   */
  async createToken(options: {
    from: Account;
    name: string;
    abbr: string;
    totalSupply: number;
    trxNum: number;
    num: number;
    startTime: Date;
    endTime: Date;
    description: string;
    url: string;
    freeAssetNetLimit: number;
    publicFreeAssetNetLimit: number;
    frozenSupply: any;
  }) {
    return await this.executeTx(
      `/wallet/createassetissue`,
      {
        owner_address: addressToHex(options.from.address),
        name: utf8ToHex(options.name),
        abbr: utf8ToHex(options.abbr),
        total_supply: options.totalSupply,
        trx_num: options.trxNum,
        num: options.num,
        start_time: options.startTime.valueOf(),
        end_time: options.endTime.valueOf(),
        description: utf8ToHex(options.description),
        url: utf8ToHex(options.url),
        free_asset_net_limit: options.freeAssetNetLimit,
        public_free_asset_net_limit: options.publicFreeAssetNetLimit,
        frozen_supply: options.frozenSupply,
      },
      options.from.privateKey
    );
  }

  async waitForTx(tx: TxHash, timeout: number = 5000): Promise<TransactionInfo> {
    return pollTimeout(
      async () => {
        const txInfo = await this.getTransactionInfoById(tx);
        if (txInfo != null) {
          return { ok: true, value: txInfo };
        } else {
          return { ok: false };
        }
      },
      timeout,
      Math.min(timeout / 10, 500)
    );
  }

  /** Alias fro createTransaction */
  transferTrx = this.createTransaction;
}

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function pollTimeout<A>(
  poller: () => Promise<{ ok: boolean; value?: A }>,
  timeout: number,
  pollWait: number
) {
  const timeoutDate = Date.now() + timeout;

  while (Date.now() < timeoutDate) {
    const res = await poller();
    if (res.ok) {
      return res.value!;
    }

    if (Date.now() + pollWait >= timeoutDate) {
      break;
    }
    await wait(pollWait);
  }
  throw new Error(`Timeout: after ${timeout} ms`);
}
