import { spawn, execSync, ChildProcess } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import minimist from 'minimist';
import { setupNode } from '../setup-node';
import { Socket } from 'net';
import { info, exitWithMsg } from '../utils/scripts';
import chalk from 'chalk';
import { deployDevelopmentContracts, saveContracts } from '../utils/develop';
import { wait } from '../utils/async';

const ROOTPATH = path.normalize(path.join(__dirname, '../..'));
const DEPLOYPATH = path.join(ROOTPATH, 'deploy');

const NodeConf = {
  full: {
    path: path.join(DEPLOYPATH, 'full'),
    logfile: path.join(DEPLOYPATH, 'full', 'logs', 'tron.log'),
    options: [
      `-Dlogback.configurationFile=${path.join(DEPLOYPATH, 'full', 'logback.xml')}`,
      '-jar',
      './FullNode.jar',
      '-c',
      './node.conf',
      '--witness',
      '--support-constant',
    ],
  },
  solidity: {
    path: path.join(DEPLOYPATH, 'solidity'),
    logfile: path.join(DEPLOYPATH, 'solidity', 'logs', 'tron.log'),
    options: [
      `-Dlogback.configurationFile=${path.join(DEPLOYPATH, 'solidity', 'logback.xml')}`,
      '-jar',
      './SolidityNode.jar',
      '-c',
      './node.conf',
    ],
  },
};

let subprocesses: ChildProcess[] = [];
function gracefullShutdown(code: number) {
  subprocesses.forEach(p => {
    p.kill('SIGINT');
  });
  process.exit(code);
}
process.on('SIGINT', () => gracefullShutdown(1));
process.on('SIGTERM', () => gracefullShutdown(1));

function resetEnvironment() {
  fs.removeSync(path.join(NodeConf.full.path, 'output-directory'));
  fs.removeSync(path.join(NodeConf.full.path, 'logs'));
  fs.removeSync(path.join(NodeConf.solidity.path, 'output-directory'));
  fs.removeSync(path.join(NodeConf.solidity.path, 'logs'));

  fs.removeSync(path.join(DEPLOYPATH, 'tokens.json'));
  fs.removeSync(path.join(DEPLOYPATH, 'accounts.json'));
}

function runNode(name: 'full' | 'solidity') {
  info(`Starting ${name} node...`);
  const prefix = name === 'full' ? chalk.green(name) : chalk.red(name);
  const conf = NodeConf[name];
  const p = spawn('java', conf.options, { cwd: conf.path });
  subprocesses.push(p);

  const state = {
    paused: false,
    buffer: {
      stdout: [] as string[],
      stderr: [] as string[],
    },
  };

  p.stdout.on('data', data => {
    if (state.paused) {
      state.buffer.stdout.push(`${prefix}> ${data}`);
    } else {
      process.stdout.write(`${prefix}> ${data}`);
    }
  });

  p.stderr.on('data', data => {
    if (state.paused) {
      state.buffer.stderr.push(`${prefix}> ${data}`);
    } else {
      process.stderr.write(`${prefix}> ${data}`);
    }
  });

  p.on('close', code => {
    subprocesses = subprocesses.filter(x => x === p);
    info(`${prefix}:: exited with code ${code}`);
  });

  p.on('error', err => {
    console.error(err);
  });

  return {
    pause() {
      info(`Pausing node output: ${prefix}`);
      state.paused = true;
    },
    unpause() {
      if (state.paused) {
        info(`Resuming node output: ${prefix}`);
        state.paused = false;
        state.buffer.stdout.forEach(line => process.stdout.write(line));
        state.buffer.stderr.forEach(line => process.stderr.write(line));
        state.buffer.stdout = [];
        state.buffer.stderr = [];
      }
    },
  };
}

function isPortOpen(port: number): Promise<{ open: boolean; msg?: string }> {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    let ended = false;
    socket.setTimeout(1000);
    socket.once('connect', () => {
      socket.destroy();
      resolve({ open: true });
    });
    socket.once('timeout', () => {
      ended = true;
      socket.destroy();
      resolve({ open: false, msg: 'timeout' });
    });
    socket.on('error', err => {
      if ((err as any).code === 'ECONNREFUSED') {
        ended = true;
        setTimeout(() => {
          resolve({ open: false, msg: 'connection refused' });
        }, 1000);
      } else {
        info('got error', err);
      }
    });
    socket.once('close', withErrors => {
      if (withErrors && !ended) {
        ended = true;
        resolve({ open: false, msg: 'unknown error' });
      }
    });
    socket.connect(
      port,
      '127.0.0.1'
    );
  });
}

async function waitForPort(port: number) {
  for (let i = 0; i < 10; i++) {
    const isOpen = await isPortOpen(port);
    if (isOpen.open) {
      info(`connected to port ${port}!!`);
      return true;
    }
    info(`connecting to port ${port} failed ${isOpen.msg!} [${i + 1} tries]`);
  }
  return false;
}

const options = minimist(process.argv.slice(2), {
  boolean: ['reset'],
});

(async function() {
  info('Checking if there is a running node...');
  const { open } = await isPortOpen(16667);
  if (open) {
    exitWithMsg('There is a running node, kill it and start again');
  }

  if (options.reset) {
    // 1. clean workdir
    info('Reset workpath...');
    resetEnvironment();

    info('Reset Postgres Database (dev)');
    execSync(`./bin/resetdb.sh dev`, { cwd: ROOTPATH, stdio: 'inherit' });
    info('Reset Postgres Database (test)');
    execSync(`./bin/resetdb.sh test`, { cwd: ROOTPATH, stdio: 'inherit' });
  } else {
    info('No Reset, run node only');
  }

  const fullNode = runNode('full');
  const solidityNode = runNode('solidity');

  info('Waiting for servers to start...');
  const isOpen = await waitForPort(16667);

  if (!isOpen) {
    info("Server didn't start ok. exiting");
    process.exit(1);
  }

  if (options.reset) {
    await wait(3000);
    fullNode.pause();
    solidityNode.pause();
    await setupNode();

    info('Contract Deployment');
    const contracts = await deployDevelopmentContracts();
    const contractFile = path.normalize(path.join(ROOTPATH, './deploy/devcontracts.json'));

    const contractAddresses: any = {};
    for (const k of Object.keys(contracts)) {
      contractAddresses[k] = contracts[k].address;
    }

    info('Write contract file (%s)', contractFile);
    saveContracts(contractAddresses);


    fullNode.unpause();
    solidityNode.unpause();
  }
})().catch(err => {
  console.error(err.stack);
  gracefullShutdown(1);
  // exitWithMsg('Failed with error: %s', err.stack);
});
