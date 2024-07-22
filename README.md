# BGD Labs <> Aave CLI

## About

`aave-cli` is a command line tool providing commands to automate certain tasks when interacting with the aave protocol.
For a full overview of features you can run `aave-cli --help`

## Installation

Make sure to setup your .env as most utilities rely on tenderly and will fail otherwise.
```
TENDERLY_ACCESS_TOKEN=
TENDERLY_PROJECT_SLUG=
TENDERLY_ACCOUNT=
```

Local installation
```
npm i @bgd-labs/aave-cli
```

Global installation
```
npm i -g @bgd-labs/aave-cli
```

Once installed you should be able to run commands via the `@bgd-labs/aave-cli` or the `aave-cli` binary.

Alteratively you can use `npx @bgd-labs/aave-cli` to run the cli via npx.

## Fork

`aave-cli fork --chainId <id>` can ge used to generate tenderly forks.
The cli allows executing certain proposal/actionset IDs, an address or even local payload via aave governance.
For a full overview of commands please run `aave-cli fork --help`

## Ipfs

`aave-cli ipfs <source>` can be used to generate the `bs58` hash of a single file.

## Diff-Snapshots

`aave-cli diff <from> <to>` can be used to diff two config snapshots & generate a human readable report.

## Governance

### Simulation

`aave-cli governance simulate [proposalId]` can be used to simulate a certain proposal on tenderly (e2e across all networks). This feature is intended to be used by systems like seatbelt.

### View

`aave-cli governance view` will start a command line ui for the aave governance.
The command line ui, explains how to vote and generates the proofs needed for voting or registering roots.

### GetStorageRoots

`aave-cli governance getStorageRoots --proposalId <id>` is a utilitiy that generates the storage roots for the data warehouse.

### GetVotingProofs

`aave-cli governance getVotingProofs --proposalId <id> --voter <voter>` generates the voting proofs for a specific address.
