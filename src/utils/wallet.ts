import * as  ethjsutil from 'ethereumjs-util';
import { Signature } from '../model/message';

export function signMessage(message: string, privKey: string): Signature {
  const hashedMsg = ethjsutil.sha256(message);
  const rsv = ethjsutil.ecsign(hashedMsg, new Buffer(privKey.substr(2), "hex"));
  return {
    r: rsv.r.toString('hex'),
    s: rsv.s.toString('hex'),
    v: rsv.v
  };
}

export function recoverSignatureAddress(message: string, signature: Signature) {
  const hashedMsg = ethjsutil.sha256(message);
  const publicKey = ethjsutil.ecrecover(
    hashedMsg,
    signature.v,
    new Buffer(signature.r, "hex"),
    new Buffer(signature.s, "hex")
  );
  const addressBuffer = ethjsutil.pubToAddress(publicKey);
  const address = ethjsutil.bufferToHex(addressBuffer);
  return address;
}

export function signHash(hashedMsg: Buffer, privKey: string): Signature {
  const rsv = ethjsutil.ecsign(hashedMsg, new Buffer(privKey.substr(2), "hex"));
  return {
    r: rsv.r.toString('hex'),
    s: rsv.s.toString('hex'),
    v: rsv.v
  };
}
export function recoverSignatureAddressFromHash(hashedMsg: Buffer, signature: Signature) {
  const publicKey = ethjsutil.ecrecover(
    hashedMsg,
    signature.v,
    new Buffer(signature.r, "hex"),
    new Buffer(signature.s, "hex")
  );
  const addressBuffer = ethjsutil.pubToAddress(publicKey);
  const address = ethjsutil.bufferToHex(addressBuffer);
  return address;
}
