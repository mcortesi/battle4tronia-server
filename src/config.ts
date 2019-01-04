import fs from 'fs-extra';
import path from 'path';
import { cached, defaultEnv, defaultEnvFor, getEnv } from './utils/config';
import { getContracts } from './utils/develop';

defaultEnv('NODE_ENV', 'development');

defaultEnvFor(['development', 'test'], () => ({
  POSTGRESQL_HOST: 'localhost',
  POSTGRESQL_DATABASE_NAME: process.env.NODE_ENV === 'test' ? 'battlefortronia_test' : 'battlefortronia_dev',
  POSTGRESQL_USER: 'battlefortronia',
  POSTGRESQL_PASSWORD: 'battlefortronia',
  SOLIDITYNODE_URI: 'http://127.0.0.1:8080',
  DELEAR_ADDRESS: '',
  DELEAR_PK: ''
  /*FULLNODE_URI: 'http://127.0.0.1:8080',
  FULLNODE_URI: 'https://api.trongrid.io',
  SOLIDITYNODE_URI: 'https://api.trongrid.io',
  DEALER_ADDRESS: '',
  DEALEAR_PK: ''*/
}));

export const postgresConfig = cached(() => ({
  host: getEnv('POSTGRESQL_HOST'),
  port: getEnv('POSTGRESQL_PORT', parseInt, 5432),
  database: getEnv('POSTGRESQL_DATABASE_NAME', 'battlefortronia'),
  user: getEnv('POSTGRESQL_USER'),
  password: getEnv('POSTGRESQL_PASSWORD'),
}));

export const getDealer = cached(() => ({
  public: getEnv('DEALER_ADDRESS'),
  private: getEnv('DEALEAR_PK'),
}));

export const getNodeUri = cached(() => ({
  full: getEnv('FULLNODE_URI'),
  solidity: getEnv('SOLIDITYNODE_URI'),
}));

export const contracts = cached(() => {
  if (process.env.NODE_ENV === 'production') {
    return {
      battleForTronia: getEnv('BATTLEFORTRONIA_ADDR'),
    };
  } else {
    const contracts = getContracts();
    return {
      battleForTronia: contracts.battleForTronia,
    };
  }
});

const CONTRAT_OUT_PATH = path.join(__dirname, '../solidity-out');

export function getABI(name: string) {
  return fs.readJsonSync(path.join(CONTRAT_OUT_PATH, `${name}.abi.json`));
}

export const easyTradeABI = cached(() => getABI('BattleForTronia'));
