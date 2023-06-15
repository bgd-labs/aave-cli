import { arbitrum, optimism, polygon } from 'viem/chains';
import { getTenderlyActionSetCreationPayload } from '../simulate/networks/commonL2';
import { polygonExecutorContract } from '../simulate/networks/polygon';
import { arbitrumClient, optimismClient, polygonClient } from '../utils/rpcClients';
import { tenderly } from '../utils/tenderlyClient';
import { arbitrumExecutorContract } from '../simulate/networks/arbitrum';
import { optimismExecutorContract } from '../simulate/networks/optimism';
import { logInfo } from '../utils/logger';

export const command = 'fork';

export const describe = 'creates a tenderly fork';

export const builder = (yargs) =>
  yargs
    .option('chainId', {
      type: 'number',
      describe: 'the chainId to fork',
    })
    .option('blockNumber', {
      type: 'number',
      describe: 'the blocknumber to fork (latest if omitted)',
    })
    .option('alias', {
      type: 'string',
      describe: 'custom alias',
    })
    .option('proposalId', {
      type: 'number',
      describe: 'Proposal or actionSetId',
    })
    .option('payloadAddress', {
      type: 'string',
      describe: 'address of the payload to execute',
    });

const getL2 = (chainId: number) => {
  if (chainId === polygon.id) return [polygonExecutorContract, polygonClient];
  if (chainId === arbitrum.id) return [arbitrumExecutorContract, arbitrumClient];
  if (chainId === optimism.id) return [optimismExecutorContract, optimismClient];
  throw new Error(`ChainId: ${chainId} not supported`);
};

export const handler = async function (argv) {
  const fork = await tenderly.fork({ chainId: argv.chainId, blockNumber: argv.blockNumber, alias: argv.alias });
  const [executor, client] = getL2(argv.chainId);
  if (argv.proposalId) {
    // TODO:
  } else if (argv.payloadAddress) {
    const payload = await getTenderlyActionSetCreationPayload(executor, client, {
      calldatas: ['0x0'],
      signatures: ['execute()'],
      targets: [argv.payloadAddress],
      values: [0n],
      withDelegatecalls: [true],
    });
    await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
  }
};
