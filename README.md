# BGD Labs <> Aave CLI

## About

`aave-cli` is a command line tool providing commands to automate certain tasks when interacting with the aave protocol.
For a full overview of features you can run `aave-cli --help`

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

`aave-cli goverannce view` will start a command line ui for the aave governance.
The command line ui, explains how to vote and generates the proofs needed for voting or registering roots.

### GetStorageRoots

`aave-cli governance getStorageRoots --proposalId <id>` is a utilitiy that generates the storage roots for the data warehouse.

### GetVotingProofs

`aave-cli governance getVotingProofs --proposalId <id> --voter <voter>` generates the voting proofs for a specific address.
