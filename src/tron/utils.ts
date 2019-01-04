import bs58check from 'bs58check';
import { Address } from './types';
import { ethers, BigNumber } from 'ethers';
import BN from 'bn.js';
import { ec as EC } from 'elliptic';

// FOR Addresses

export function isValidAddress(addr: Address) {
  return addr.length === 34 && addr.indexOf('T') === 0;
}

export function isHexAddress(addr: string) {
  return addr.length === 42 && addr.indexOf('41') === 0;
}

export function addressToHex(str: string): string {
  if (isHexAddress(str)) {
    return str;
  } else {
    return bs58check.decode(str).toString('hex');
  }
}

export function hexToAddress(str: string): Address {
  if (str.length < 2 || (str.length & 1) != 0) {
    throw new Error(`Invalid hex string: ${str}`);
  }
  return bs58check.encode(Buffer.from(str, 'hex'));
}

// FOR strings

export function hexToUtf8(hex: string) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

export function utf8ToHex(str: string) {
  return Buffer.from(str, 'utf8').toString('hex');
}

export function ensure0xPrefix(str: string) {
  if (str.slice(0, 2) === '0x') {
    return str;
  } else {
    return '0x' + str;
  }
}

export function remove0x(hexStr: string) {
  return ensure0xPrefix(hexStr).replace(/^(0x)/, '');
}

export function addressToEVMAddress(addr: Address) {
  return '0x' + addressToHex(addr).slice(2);
  // return ensure0xPrefix(addressToHex(addr));
}

export function EVMAddressToAddress(evmAddress: string) {
  // return hexToAddress('41' + remove0x(evmAddress));
  return hexToAddress('41' + evmAddress.slice(2));
}

export function encodeParameters(types: string[], values: any[]) {
  const coder = new ethers.AbiCoder();

  values = values.map(
    (value, idx) => (types[idx] === 'address' ? addressToEVMAddress(value) : value)
  );
  return remove0x(coder.encode(types, values));
}

export function decodeParameters(types: string[], encodedData: string) {
  const coder = new ethers.AbiCoder();
  let values = coder.decode(types, '0x' + encodedData);

  values = values.map(
    (value, idx) => (types[idx] === 'address' ? EVMAddressToAddress(value) : value)
  );

  return values;
}

export function encondeContractCall(methodSignature: string, values: any[]) {
  let method: string = methodSignature.replace(/\s+/g, '');
  const match = /.*\(([a-z0-9,]*)\)/.exec(method);
  if (!match) {
    throw new Error(`invalid methodSignature: ${methodSignature}`);
  }
  const paramTypes: string[] = match[1].length > 0 ? match[1].split(',') : [];

  return {
    functionSignature: method,
    functionData: encodeParameters(paramTypes, values),
  };
}

export function fromBN(bn: BN): BigNumber {
  return new BigNumber(bn.toString());
}

export function toBN(bn: BigNumber): BN {
  return new BN(bn.toString());
}

function byte2hexStr(byte) {
  const hexByteMap = '0123456789ABCDEF';

  let str = '';
  str += hexByteMap.charAt(byte >> 4);
  str += hexByteMap.charAt(byte & 0x0f);

  return str;
}

export function ecsign(hash: string, privateKey: string): string {
  const ec = new EC('secp256k1');

  const pkBytes = Buffer.from(privateKey, 'hex');
  const key = ec.keyFromPrivate(pkBytes, 'bytes');
  const signature = key.sign(Buffer.from(hash, 'hex'));
  const r = signature.r;
  const s = signature.s;
  const id = signature.recoveryParam;

  let rHex = r.toString('hex');

  while (rHex.length < 64) {
    rHex = `0${rHex}`;
  }

  let sHex = s.toString('hex');

  while (sHex.length < 64) {
    sHex = `0${sHex}`;
  }

  const idHex = byte2hexStr(id);
  const signHex = rHex + sHex + idHex;

  return signHex;
}
