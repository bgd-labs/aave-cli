# BGD Labs <> Aave CLI

`aave-cli` is a command line tool providing commands to automate certain tasks when interacting with the aave protocol.

## Fork

`aave-cli fork --help` can ge used to generate tenderly forks. The cli allows executing certain proposal/actionset IDs, an address or even local payload via aave governance.

## Ipfs

`aave-cli ipfs <source>` can be used to generate the `bs58` hash of a single file.

## Diff-Snapshots

`aave-cli diff <from> <to>` can be used to diff two config snapshots & generate a human readable report.

## Simulate

`aave-cli simulate-proposal [proposalId]` can be used to simulate a certain proposal on tenderly (e2e across all networks). This feature is intended to be used by systems like seatbelt.

**Note**: currently nothing else is done in this script. You need to manually check the tenderly changes.
In the future we plan to support seatbelt report generation from here.
