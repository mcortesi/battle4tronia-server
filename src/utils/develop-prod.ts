import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import assert from 'assert';
import TWeb from '../tron/tweb';
import { Account, ResourceType, ContractResult, Address } from '../tron/types';
import { encodeParameters, addressToEVMAddress } from '../tron/utils';
import { connectContract } from '../tron/contract';

export const Zion: Account = {
  privateKey: '',
  address: '',
};

export const delearAddress = '';

const outpath = (name: string) => path.join(__dirname, '../../solidity-out', name);

export function getAccounts(): Record<'danny' | 'cono' | 'oswald', Account> {
  let accounts;
  try {
    accounts = fs.readJsonSync(path.join(__dirname, '../../deploy/accounts.json'));
  } catch (err) {
    console.error(`Error reading accounts.json. Check file manually`);
    throw err;
  }
  return accounts;
}

export type ContractAddresses = {
  battleForTronia: Address;
};

const ContractAddressesFile = path.join(__dirname, '../../deploy/devcontracts.json');
export function getContracts(): ContractAddresses {
  let contracts;
  try {
    contracts = fs.readJsonSync(ContractAddressesFile);
  } catch (err) {
    console.error(`Error reading accounts.json. Check file manually`);
    throw err;
  }
  return contracts;
}

export function saveContracts(contracts: ContractAddresses): void {
  fs.writeJsonSync(ContractAddressesFile, contracts);
}

export function loadContract(name: string): { abi: any[]; bytecode: string } {
  const abi = fs.readJsonSync(outpath(`${name}.abi.json`));
  const bytecode = fs
    .readFileSync(outpath(`${name}.bytecode`))
    .toString('utf8')
    .trim();

  return { abi, bytecode };
}

export const tweb = new TWeb('https://api.trongrid.io', 'https://api.trongrid.io');

export async function deployContract(
  name: string,
  parameters: any[] = [],
  account: Account = Zion
) {
  console.log(chalk.green(`${name}: Deployment Start`));

  const { abi, bytecode } = loadContract(name);

  //const freezeTx = await tweb.freezeBalance(10000000, 3, ResourceType.Energy, { from: account });
  //console.log(`${name}: freeze: 10000000 TRX x Energy (tx:${freezeTx})`);

  let parameter: string | undefined = undefined;
  const constructor = abi.find(i => i.type === 'constructor');
  if (constructor && parameters.length > 0) {
    const ctypes = constructor.inputs.map(input => input.type);
    assert(ctypes.length === parameters.length, 'constructor params length doesnt match');
    parameter = encodeParameters(ctypes, parameters);
  }

  const txId = await tweb.deployContractV2({
    abi: JSON.stringify(abi),
    bytecode,
    parameter,
    feeLimit: 100000000,
    originEnergyLimit: 100000000,
    from: account,
  });
  console.log(`${name}: deployTx: ${txId}`);

  const txInfo = await tweb.waitForTx(txId, 20000);

  if (!txInfo.receipt || txInfo.receipt.result !== ContractResult.SUCCESS) {
    throw new Error(`Deploy Error: ${JSON.stringify(txInfo.receipt)}`);
  }

  const contractAddress = txInfo.contractAddress!;
  console.log(`${name}: deployAddress: ${contractAddress}`);
  console.log(chalk.green(`${name}: Deployment Finished`));
  return connectContract(tweb, contractAddress, abi, {
    from: account,
    feeLimit: 100000,
  });
}

export async function deployDevelopmentContracts() {
  const battleForTronia = await deployContract(
    'BattleForTronia',
    [Zion.address, 1500, 201600],
    Zion
  );

  return {
    battleForTronia,
  };
}
