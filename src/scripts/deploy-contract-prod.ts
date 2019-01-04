import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import minimist from 'minimist';
import { setupNode } from '../setup-node';
import { Socket } from 'net';
import { info, exitWithMsg } from '../utils/scripts';
import chalk from 'chalk';
import { deployDevelopmentContracts, saveContracts } from '../utils/develop-prod';
import { wait } from '../utils/async';

(async function() {
  info('Checking if there is a running node...');

  info('Contract Deployment');
  const contracts = await deployDevelopmentContracts();
  for (const k of Object.keys(contracts)) {
    info(contracts[k].address);
  }


})().catch(err => {
  console.error(err.stack);
  // exitWithMsg('Failed with error: %s', err.stack);
});
