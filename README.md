# BGD Labs <> Aave CLI

`aave-cli` is a command line tool providing commands to automate certain tasks when interacting with the aave protocol.

## Ipfs

`aave-cli ipfs <source>` can be used to generate the `bs58` hash of a single file.

## Diff-Snapshots

`aave-cli diff <from> <to>` can be used to diff two config snapshots & generate a human readable report.

## Simulate

`aave-cli simulate-proposal [proposalId]` can be used to simulate a certain proposal on tenderly.

**Note**: currently nothing else is done in this script. You need to manually check the tenderly changes.
In the future we plan to support seatbelt report generation from here.
