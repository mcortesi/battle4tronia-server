## Setup Environment

**First:** You need to fetch and place FullNode.jar and SolidityNode.jar in the corresponding
folders

```
cp FullNode.jar ./deploy/full/
cp SolidityNode.jar ./deploy/solidity/
```

### Run Nodes

Just do

```
$ yarn node:start --reset
```

This will:

- Clean up previous node database (because of the `--reset` flag)
- Start Full Node
- Start Solidity Node
- Create Tokens & Test accounts. Leave information in `deploy/accounts.json` & `deploy/tokens.json`
  (because of the `--reset` flag)
- do a `tail -f` for solidity and full node logs, and output to stdout

You can kill the node (Ctrl-C), and run it again. You can ommit the `--reset` flag, and it will
only run the nodes. The previous state (tokens & accounts) will still be there.

After each time you do a reset, is recommend to deploy development contracts to it. To do this, run:

    yarn dev:setup

### Work on contracts

To work on contracts we are using remixIDE (http://remix.ethereum.org)

You need to setup _remixd_ for remix to work with your local files.

Steps:

1. Install remixd `npm install -g remixd`
2. Run remixd to share **contracts** folder:

```
remixd -s `realpath sol-contract/contracts/`
```

3. On remixIDE follow connect instructions (https://remix.readthedocs.io/en/latest/tutorial_remixd_filesystem.html)

After you compile and check the contracts you need to manually update bytecode and abi in `solidity-out` folder.

To do so, select the contract on remixIDE and press `details`. There you will find the ABI and the bytecode

### Setup Postgresql

Run:

```bash
sudo su - createuser -s -W -P battlefortronia             # Don't needed in Mac
createuser -s -W -P battlefortronia     # (enter battlefortronia as password)
createdb -O battlefortronia battlefortronia_dev  # dev database
createdb -O battlefortronia battlefortronia_test # test database
logout                         # Don't needed in Mac
```

Every time you want to reset the schema, run:

```bash
./bin/resetdb.sh test               # recreates battlefortronia_test
./bin/resetdb.sh dev                # recreates battlefortronia_dev
```

### Run API Server

Make sure you have the tron nodes running, and that you've already did `dev:setup` (`yarn dev:setup`).

Then run:

    yarn web:start

and you can connect to `http://localhost:8000`, for example:

    curl http://localhost:8000/api/v1/tokens
