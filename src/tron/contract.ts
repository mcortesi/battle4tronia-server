import TWeb from './tweb';
import {
  Account,
  Address,
  TransactionRaw,
  TriggerSmartContractRaw,
  LogEvent,
  TransactionInfo,
} from './types';
import {
  decodeParameters,
  encodeParameters,
  addressToEVMAddress,
  ensure0xPrefix,
  hexToAddress,
  remove0x,
  EVMAddressToAddress,
} from './utils';
import { ethers } from 'ethers';
import BN from 'bn.js';

export interface ABIParameter {
  name: string;
  type: string;
}

export interface ABIFunction {
  constant: boolean;
  inputs: ABIParameter[];
  name: string;
  outputs: ABIParameter[];
  payable: boolean;
  stateMutability: 'nonpayable' | 'view' | 'payable' | 'pure';
  type: 'function';
}

export interface DefaultOpts {
  from?: Account;
  feeLimit?: number;
}

export interface CallOpts {
  from?: Account;
  feeLimit?: number;
  value?: number;
}

export interface ContractCtx {
  address: Address;
  defaultOpts: DefaultOpts;
  tweb: TWeb;
}

function mergeOpts(defaultOpts: DefaultOpts, opts: CallOpts = {}): CallOpts {
  return {
    from: opts.from != null ? opts.from : defaultOpts.from,
    feeLimit: opts.feeLimit != null ? opts.feeLimit : defaultOpts.feeLimit,
    value: opts.value,
  };
}

function check(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ValidationError: ${message}`);
  }
}

function ValidationError(msg) {
  return new Error(`ValidationError: ${msg}`);
}

export interface DecodedCall {
  method: string;
  parameters: any[];
  sender: Address;
  value: BN;
}
export interface DecodedEvent {
  contractAddress: Address;
  name: string;
  parameters: any[];
}

export class ContractTxAnalyzer {
  address: Address;
  evmAddress: string;
  methodMap: Record<string, any> = {};
  eventMap: Record<string, any> = {};

  constructor(abi: any[], address: Address) {
    this.address = address;
    this.evmAddress = addressToEVMAddress(address);
    this.parseABI(abi);
  }

  private parseABI(abi: any[]) {
    this.methodMap = {};
    this.eventMap = {};

    for (const fnAbi of abi.filter(i => i.type === 'function')) {
      const inputTypes = fnAbi.inputs.map(ip => ip.type);
      const selector = `${fnAbi.name}(${inputTypes.join(',')})`;
      const methodHash = ethers.utils.id(selector).slice(2, 2 + 4 * 2); // 1st 4 bytes of hash
      this.methodMap[methodHash] = fnAbi;
    }

    for (const eventAbi of abi.filter(i => i.type === 'event')) {
      const inputTypes = eventAbi.inputs.map(ip => ip.type);
      const selector = `${eventAbi.name}(${inputTypes.join(',')})`;
      const eventHash = remove0x(ethers.utils.id(selector));
      this.eventMap[eventHash] = eventAbi;
    }
  }

  isContractTx(tx: TransactionRaw) {
    const contract = tx.raw_data.contract[0];
    return (
      contract.type === 'TriggerSmartContract' &&
      EVMAddressToAddress(contract.parameter.value.contract_address) === this.address
    );
  }

  isContractLogEvent(log: LogEvent) {
    return log.address === this.address; // Logs come with Tron Address format
  }

  decodeCall(tx: TransactionRaw): DecodedCall {
    const contract = tx.raw_data.contract[0] as TriggerSmartContractRaw;
    const data = contract.parameter.value.data; // data doesnt have 0x prefix
    const methodHash = data.slice(0, 4 * 2);
    if (methodHash in this.methodMap) {
      const fnAbi = this.methodMap[methodHash];

      return {
        method: fnAbi.name,
        parameters: decodeParameters(fnAbi.inputs.map(ip => ip.type), data.slice(4 * 2)),
        value: new BN(contract.parameter.value.call_value),
        sender: hexToAddress(contract.parameter.value.owner_address),
      };
    } else {
      throw new Error('Unkown method call. check ABI');
    }
  }

  decodeTxEvents(txinfo: TransactionInfo): DecodedEvent[] {
    return txinfo.log
      .filter(log => this.isContractLogEvent(log))
      .map(log => this.decodeLogEvent(log));
  }

  decodeLogEvent(log: LogEvent): DecodedEvent {
    const data = log.data; // data doesnt have 0x prefix
    const eventHash = log.topics[0];
    if (eventHash in this.eventMap) {
      const eventAbi = this.eventMap[eventHash];

      return {
        contractAddress: log.address,
        name: eventAbi.name,
        parameters: decodeParameters(eventAbi.inputs.map(ip => ip.type), data),
      };
    } else {
      throw new Error('Unkown method call. check ABI');
    }
  }
}

export function contractCallDecoder(abi: any[]) {}

export function connectContract(
  tweb: TWeb,
  address: Address,
  abi: any[],
  defaultOpts: DefaultOpts = {}
): any {
  const ctx = {
    tweb,
    defaultOpts,
    address,
  };
  const contractClient = {
    address: address,
  };

  for (const fnAbi of abi.filter(i => i.type === 'function')) {
    contractClient[fnAbi.name] = createFunctionWrapper(ctx, fnAbi);
  }

  return contractClient;
}

function createFunctionWrapper(ctx: ContractCtx, fnAbi: ABIFunction) {
  const inputTypes = fnAbi.inputs.map(ip => ip.type);
  const outputTypes = fnAbi.outputs.map(ip => ip.type);
  const selector = `${fnAbi.name}(${inputTypes.join(',')})`;
  const nInputs = inputTypes.length;

  return async (...args: any[]) => {
    let opts: CallOpts;
    let params: any[];
    if (args.length === nInputs + 1) {
      params = args.slice(0, nInputs);
      opts = mergeOpts(ctx.defaultOpts, args[nInputs]);
    } else if (args.length === nInputs) {
      params = args;
      opts = ctx.defaultOpts;
    } else {
      throw ValidationError('bad number of parameters');
    }

    check(
      fnAbi.stateMutability == 'payable' || opts.value == null,
      'non payable function, cant send trx'
    );

    let parameter = nInputs > 0 ? encodeParameters(inputTypes, params) : undefined;

    if (fnAbi.stateMutability === 'view' || fnAbi.stateMutability === 'pure') {
      const outputs = await ctx.tweb.querySmartContract({
        contractAddress: ctx.address,
        functionSelector: selector,
        parameter,
        from: opts.from,
      });
      const decodedOutput = decodeParameters(outputTypes, outputs[0]);
      if (fnAbi.outputs.length === 1) {
        return decodedOutput[0];
      } else {
        return decodedOutput;
      }
    } else {
      check(opts.from != null, 'missing opts.from');
      check(opts.feeLimit != null, 'missing opts.feeLimit');
      return ctx.tweb.triggerSmartContract({
        contractAddress: ctx.address,
        feeLimit: opts.feeLimit!,
        functionSelector: selector,
        parameter,
        from: opts.from!,
        callValue: opts.value,
      });
    }
  };
}
