import BN from 'bn.js';

export type BNToString<A> = A extends BN
  ? string
  : A extends Buffer ? string : A extends Date ? string : A;
export type JsonOf<A> = { [T in keyof A]: BNToString<A[T]> };
