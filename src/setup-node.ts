import fs from 'fs-extra';
import path from 'path';
import TWeb from './tron/tweb';
import { Account, ResourceType } from './tron/types';
import { trxToSun } from './tron/units';
import { info } from './utils/scripts';

const TOKENSJSON = path.join(__dirname, '../deploy/tokens.json');
const ACCOUNTSJSON = path.join(__dirname, '../deploy/accounts.json');

const tweb = new TWeb('http://localhost:16667', 'http://localhost:16668');

const Zion = {
  privateKey: 'da146374a75310b9666e834ee4ad0866d6f4035967bfc76217c5a495fff9f0d0',
  address: 'TPL66VK2gCXNCD7EJg9pgJRfqcRazjhUZY',
};

// async function simpleCreateToken(name: string, from: Account) {
//   const tx = await tweb.createToken({
//     from: from,
//     name: name,
//     abbr: name,
//     totalSupply: 1000000,
//     trxNum: 1,
//     num: 1,
//     startTime: new Date(Date.now()),
//     endTime: new Date(Date.now() + 5000000),
//     description: 'A nice token',
//     url: `http://${name}.com`,
//     freeAssetNetLimit: 0,
//     publicFreeAssetNetLimit: 0,
//     frozenSupply: { frozen_amount: 1, frozen_days: 2 },
//   });
// }

// async function checkExistentTokens(): Promise<null | Record<string, Account>> {
//   const currentTokens = await tweb.getAssetIssueList();

//   if (currentTokens.length === 3 && fs.existsSync(TOKENSJSON)) {
//     info('Token file found. Checking content...');
//     const accounts = fs.readJsonSync(TOKENSJSON);
//     for (const token of currentTokens) {
//       if (token.ownerAddress !== accounts[token.name].address) {
//         info('Token file outdated, recreating tokens!');
//         // throw new Error("Token file doesnt match with existing tokens");
//         return null;
//       }
//     }
//     return accounts;
//   }
//   return null;
// }

// async function checkAccountsTokens(): Promise<null | Record<string, Account>> {
//   const currentTokens = await tweb.getAssetIssueList();

//   if (currentTokens.length > 0) {
//     if (fs.existsSync(TOKENSJSON) && currentTokens.length === 3) {
//       const accounts = fs.readJsonSync(TOKENSJSON);
//       for (const token of currentTokens) {
//         if (token.ownerAddress !== accounts[token.name].address) {
//           throw new Error("Token file doesnt match with existing tokens");
//         }
//       }
//       return accounts;
//     } else {
//       throw new Error("Token file doesnt match with existing tokens");
//     }
//   }
//   return null;
// }

// async function createTokens() {
//   const existentAccounts = await checkExistentTokens();
//   if (existentAccounts != null) {
//     info('Token creation ommited. Token were already created');
//     return existentAccounts;
//   }

//   const tokenAccounts: Record<string, Account> = {};
//   // 1. Create Assets
//   for (const assetName of ['TKA', 'TKB', 'TKC']) {
//     // for (const assetName of ["TKA"]) {
//     const assetAccount = await tweb.generateAddress();
//     await tweb.transferTrx(assetAccount.address, trxToSun(10000), {
//       from: Zion,
//     });

//     await simpleCreateToken(assetName, assetAccount);
//     tokenAccounts[assetName] = assetAccount;
//   }

//   info('saving token accounts to: ', TOKENSJSON);
//   fs.writeJsonSync(TOKENSJSON, tokenAccounts);

//   return tokenAccounts;
// }

async function createTestAccount(name: string) {
  const account = await tweb.generateAddress();

  // give him some TRX
  await tweb.transferTrx(account.address, trxToSun(10000000), { from: Zion });
  await tweb.updateAccount(name, { from: account });

  // freeze Bandwidth
  await tweb.freezeBalance(10000000, 3, ResourceType.Bandwidth, { from: account });

  // // give him tokens

  // for (const tokenName of Object.keys(tokenAccounts)) {
  //   const tokenAccount = tokenAccounts[tokenName];
  //   await tweb.transferAsset({
  //     from: tokenAccount,
  //     to: account.address,
  //     assetName: tokenName,
  //     amount: 100000,
  //   });
  // }

  // const accountDetails = await tweb.getAccount(account.address);
  return account;
}

export async function setupNode() {
  // const tokenAccounts = await createTokens();
  // const currentAssets = await tweb.getAssetIssueList();
  // info(`There are ${currentAssets.length} on the blockchain`);
  // info(`Which are: `, currentAssets.map(t => t.name));

  const testAccounts = {
    danny: await createTestAccount('danny'),
    cono: await createTestAccount('cono'),
    oswald: await createTestAccount('oswald'),
  };
  info('Test accounts saved in ', ACCOUNTSJSON);
  fs.writeJson(ACCOUNTSJSON, testAccounts);
}
