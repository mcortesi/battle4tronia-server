import { hexToUtf8, hexToAddress, EVMAddressToAddress } from './utils';

export type BlockHash = string;
export type TxHash = string;
export type HexString = string;
export type HexAddress = string;
export type Address = string;

export enum ResourceType {
  Bandwidth = 0,
  Energy = 1,
}
export interface Account {
  privateKey: string;
  address: string;
}

export interface AssetToken {
  ownerAddress: Address;
  name: string;
  abbr: string;
  totalSupply: number;
  frozenSupply: AssetTokenFrozenSupply[];
  trxNum: number;
  num: number;
  startTime: Date;
  endTime: Date;
  description: string;
  url: string;
}

export interface AssetTokenFrozenSupply {
  frozenAmount: number;
  frozenDays: number;
}
export interface AssetTokenFrozenSupplyRaw {
  frozen_amount: number;
  frozen_days: number;
}

export interface AssetTokenRaw {
  owner_address: HexAddress;
  name: HexString;
  abbr: HexString;
  total_supply: number;
  frozen_supply: AssetTokenFrozenSupplyRaw[];
  trx_num: number;
  num: number;
  start_time: number;
  end_time: number;
  description: HexString;
  url: HexString;
}

export function parseAssetToken(raw: AssetTokenRaw): AssetToken {
  return {
    ownerAddress: hexToAddress(raw.owner_address),
    name: hexToUtf8(raw.name),
    abbr: hexToUtf8(raw.abbr),
    totalSupply: raw.total_supply,
    frozenSupply: raw.frozen_supply.map(fs => ({
      frozenAmount: fs.frozen_amount,
      frozenDays: fs.frozen_days,
    })),
    trxNum: raw.trx_num,
    num: raw.num,
    startTime: new Date(raw.start_time),
    endTime: new Date(raw.end_time),
    description: hexToUtf8(raw.description),
    url: hexToUtf8(raw.url),
  };
}

export interface AccountInfo {
  name?: string;
  address: Address;
  balance: number;
  asset: [
    {
      key: string;
      value: number;
    }
  ];
  createTime: Date;
  latestOperationTime: Date;
  freeNetUsage: number;
  freeAssetNetUsage: [
    {
      key: string;
      value: number;
    }
  ];
  latestConsumeFreeTime?: Date;
  account_resource: {};
}

export interface AccountInfoRaw {
  account_name?: HexString;
  address: HexAddress;
  balance: number;
  asset?: [
    {
      key: string;
      value: number;
    }
  ];
  create_time: number;
  latest_opration_time: number;
  free_net_usage: number;
  free_asset_net_usage?: [
    {
      key: string;
      value: number;
    }
  ];
  latest_consume_free_time?: number;
  account_resource: {};
}

export function parseAccountInfo(raw: AccountInfoRaw): AccountInfo {
  const info: AccountInfo = {
    address: hexToAddress(raw.address),
    balance: raw.balance,
    asset: raw.asset ? raw.asset : ([] as any),

    createTime: new Date(raw.create_time),
    latestOperationTime: new Date(raw.latest_opration_time),
    freeNetUsage: raw.free_net_usage,
    freeAssetNetUsage: raw.free_asset_net_usage ? raw.free_asset_net_usage : ([] as any),

    account_resource: {},
  };

  if (raw.account_name) {
    info.name = hexToUtf8(raw.account_name);
  }
  if (raw.latest_consume_free_time) {
    info.latestConsumeFreeTime = new Date(raw.latest_consume_free_time);
  }
  return info;
}

export enum ContractResult {
  DEFAULT = 'DEFAULT',
  SUCCESS = 'SUCCESS',
  REVERT = 'REVERT',
  BAD_JUMP_DESTINATION = 'BAD_JUMP_DESTINATION',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  PRECOMPILED_CONTRACT = 'PRECOMPILED_CONTRACT',
  STACK_TOO_SMALL = 'STACK_TOO_SMALL',
  STACK_TOO_LARGE = 'STACK_TOO_LARGE',
  ILLEGAL_OPERATION = 'ILLEGAL_OPERATION',
  STACK_OVERFLOW = 'STACK_OVERFLOW',
  OUT_OF_ENERGY = 'OUT_OF_ENERGY',
  OUT_OF_TIME = 'OUT_OF_TIME',
  JVM_STACK_OVER_FLOW = 'JVM_STACK_OVER_FLOW',
  UNKNOWN = 'UNKNOWN',
}
export interface TransactionReceiptRaw {
  energy_usage: number;
  energy_usage_total: number;
  net_usage: number;
  net_fee?: number;
  result: ContractResult;
}

enum code {
  SUCESS = 0,
  FAILED = 1,
}

export interface TransactionInfoRaw {
  // message Log {
  //   bytes address = 1;
  //   repeated bytes topics = 2;
  //   bytes data = 3;
  // }
  id: string;
  fee: number;
  blockNumber: number;
  blockTimeStamp: number;
  contractResult?: string[];
  contract_address?: string;
  receipt?: TransactionReceiptRaw;
  log?: LogEvent[];
  result?: any;
  resMessage?: string;
  withdraw_amount?: number;
  unfreeze_amount?: number;
}

export interface LogEvent {
  address: string;
  topics: string[];
  data: string;
}

export interface TransactionInfo {
  // message Log {
  //   bytes address = 1;
  //   repeated bytes topics = 2;
  //   bytes data = 3;
  // }
  id: string;
  fee: number;
  blockNumber: number;
  blockTimeStamp: number;
  contractResult?: string[];
  contractAddress?: string;
  receipt?: TransactionReceiptRaw;
  log: LogEvent[];
  result?: any;
  resMessage?: string;
  withdrawAmount?: number;
  unfreezeAmount?: number;
}

export function parseTransactionInfo(raw: TransactionInfoRaw): TransactionInfo {
  const value: TransactionInfo = {
    id: raw.id,
    fee: raw.fee,
    log: [],
    blockNumber: raw.blockNumber,
    blockTimeStamp: raw.blockTimeStamp,
  };

  if (raw.contract_address != null) {
    value.contractAddress = raw.contract_address ? hexToAddress(raw.contract_address) : undefined;
  }
  if (raw.contractResult != null) {
    value.contractResult = raw.contractResult;
  }
  if (raw.receipt != null) {
    value.receipt = raw.receipt;
  }
  if (raw.log != null) {
    value.log = raw.log.map(logEvent => ({
      address: EVMAddressToAddress('0x' + logEvent.address),
      topics: logEvent.topics,
      data: logEvent.data,
    }));
  }
  if (raw.result != null) {
    value.result = raw.result;
  }
  if (raw.resMessage != null) {
    value.resMessage = hexToUtf8(raw.resMessage);
  }
  if (raw.withdraw_amount != null) {
    value.withdrawAmount = raw.withdraw_amount;
  }
  if (raw.unfreeze_amount != null) {
    value.unfreezeAmount = raw.unfreeze_amount;
  }
  return value;
}

export enum ResourceCode {
  BANDWIDTH = 'BANDWIDTH',
  ENERGY = 'ENERGY',
}
export interface FreezeContractRaw {
  type: 'FreezeBalanceContract';
  parameter: {
    value: {
      resource: ResourceCode;
      frozen_duration: number;
      frozen_balance: number;
      owner_address: HexAddress;
    };
    type_url: 'type.googleapis.com/protocol.FreezeBalanceContract';
  };
}

export interface CreateSmartContractRaw {
  type: 'CreateSmartContract';
  parameter: {
    value: {
      owner_address: HexAddress;
      new_contract: {
        origin_address: HexAddress;
        contract_address: HexAddress;
        abi: any[];
        bytecode: string;
        call_value: number;
        consume_user_resource_percent: number;
        name: string;
      };
    };
    type_url: 'type.googleapis.com/protocol.CreateSmartContract';
  };
}

export interface TriggerSmartContractRaw {
  type: 'TriggerSmartContract';
  parameter: {
    value: {
      owner_address: HexAddress;
      contract_address: HexAddress;
      call_value: number;
      data: string;
    };
    type_url: 'type.googleapis.com/protocol.TriggerSmartContract';
  };
}

export interface UnkwonContractRaw {
  type:
    | 'AccountCreateContract'
    | 'TransferContract'
    | 'TransferAssetContract'
    | 'VoteAssetContract'
    | 'VoteWitnessContract'
    | 'WitnessCreateContract'
    | 'AssetIssueContract'
    | 'WitnessUpdateContract'
    | 'ParticipateAssetIssueContract'
    | 'AccountUpdateContract'
    | 'UnfreezeBalanceContract'
    | 'WithdrawBalanceContract'
    | 'UnfreezeAssetContract'
    | 'UpdateAssetContract'
    | 'ProposalCreateContract'
    | 'ProposalApproveContract'
    | 'ProposalDeleteContract'
    | 'SetAccountIdContract'
    | 'CustomContract'
    | 'GetContract'
    | 'UpdateSettingContract'
    | 'ExchangeCreateContract'
    | 'ExchangeInjectContract'
    | 'ExchangeWithdrawContract'
    | 'ExchangeTransactionContract';
  parameter: {
    value: any;
    type_url: string;
  };
}

export type ContractRaw =
  | FreezeContractRaw
  | TriggerSmartContractRaw
  | CreateSmartContractRaw
  | UnkwonContractRaw;

export type TransactionRaw = {
  ret: [{ contractRet: ContractResult }];
  signature: [string];
  txID: TxHash;
  raw_data: {
    contract: [ContractRaw];
    ref_block_bytes: string;
    ref_block_hash: string;
    expiration: number;
    timestamp: number;
  };
};
export type Transaction = TransactionRaw;

export interface BlockRaw {
  blockID: BlockHash;
  block_header: {
    raw_data: {
      number: number;
      txTrieRoot: string;
      witness_address: HexAddress;
      parentHash: BlockHash;
      version: number;
      timestamp: number;
    };
    witness_signature: string;
  };
  transactions?: TransactionRaw[];
}
export interface Block {
  blockID: BlockHash;
  blockHeader: {
    number: number;
    txTrieRoot: string;
    witnessAddress: Address;
    parentHash: BlockHash;
    version: number;
    timestamp: number;
    witnessSignature: string;
  };
  transactions: Transaction[];
}

export function parseBlock(raw: BlockRaw): Block {
  return {
    blockID: raw.blockID,
    blockHeader: {
      number: raw.block_header.raw_data.number,
      txTrieRoot: raw.block_header.raw_data.txTrieRoot,
      witnessAddress: raw.block_header.raw_data.witness_address,
      parentHash: raw.block_header.raw_data.parentHash,
      version: raw.block_header.raw_data.version,
      timestamp: raw.block_header.raw_data.timestamp,
      witnessSignature: raw.block_header.witness_signature,
    },
    transactions: raw.transactions || [],
  };
}
