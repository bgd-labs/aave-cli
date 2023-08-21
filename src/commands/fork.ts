import { arbitrum, base, mainnet, optimism, polygon } from 'viem/chains';
import {
  getProposalStateById,
  getTenderlyActionSetCreationPayload,
  getTenderlyActionSetExecutionPayload,
} from '../simulate/govv2/networks/commonL2';
import { polygonExecutorContract } from '../simulate/govv2/networks/polygon';
import { arbitrumClient, baseClient, optimismClient, polygonClient } from '../utils/rpcClients';
import { tenderly } from '../utils/tenderlyClient';
import { arbitrumExecutorContract } from '../simulate/govv2/networks/arbitrum';
import { optimismExecutorContract } from '../simulate/govv2/networks/optimism';
import { polygon as modulePolygon } from '../simulate/govv2/networks/polygon';
import { arbitrum as moduleArbitrum } from '../simulate/govv2/networks/arbitrum';
import { optimism as moduleOptimism } from '../simulate/govv2/networks/optimism';
import { base as moduleBase } from '../simulate/govv2/networks/base';
import { ActionSetState } from '../simulate/govv2/networks/types';
import { baseExecutorContract } from '../simulate/govv2/networks/base';

export type ForkOptions = {
  chainId: number;
  alias: string;
  blockNumber?: number;
  proposalId?: number;
  payloadAddress?: string;
  executor?: string;
};

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
    })
    .option('executor', {
      type: 'string',
      describe: '(optional) address of the executor',
    });

const getL2 = (chainId: number) => {
  if (chainId === polygon.id) return [polygonExecutorContract, polygonClient, modulePolygon] as const;
  if (chainId === arbitrum.id) return [arbitrumExecutorContract, arbitrumClient, moduleArbitrum] as const;
  if (chainId === optimism.id) return [optimismExecutorContract, optimismClient, moduleOptimism] as const;
  if (chainId === base.id) return [baseExecutorContract, baseClient, moduleBase] as const;
  throw new Error(`ChainId: ${chainId} not supported`);
};

function getAlias(options: ForkOptions) {
  const unix = Math.floor(new Date().getTime() / 1000);
  if (options.alias) {
    return `${unix}-${options.alias}`;
  } else if (options.proposalId) {
    return `${unix}-proposalId-${options.proposalId}`;
  } else if (options.payloadAddress) {
    return `${unix}-payloadAddress-${options.payloadAddress}`;
  }
  // } else if (options.artifactPath) {
  //   return `${unix}-artifact-${options.artifactPath.replace(/^.*[\\\/]/, '')}`;
  // }
  return 'vanilla-fork';
}

export const handler = async function (argv) {
  const forkConfig = {
    chainId: argv.chainId,
    alias: getAlias(argv),
  };
  if (argv.chainId === mainnet.id) {
    throw new Error('Mainnet proposal forking not yet supported');
  } else {
    const [executor, client, networkModule] = getL2(argv.chainId);
    if (argv.proposalId) {
      const { executedLogs, queuedLogs } = await networkModule.cacheLogs();
      const response = await getProposalStateById({ proposalId: argv.proposalId, executedLogs, queuedLogs });
      if (response.state === ActionSetState.NOT_FOUND) {
        throw new Error(`ActionSet ${argv.proposalId} not found`);
      } else if (response.state === ActionSetState.EXECUTED) {
        throw new Error(`ActionSet ${argv.proposalId} already executed`);
      } else {
        const payload = await getTenderlyActionSetExecutionPayload(executor, client, response.queuedLog);
        const fork = await tenderly.fork({ ...forkConfig, blockNumber: payload.block_number });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
      }
    } else if (argv.payloadAddress) {
      const payload = await getTenderlyActionSetCreationPayload(executor, client, {
        calldatas: ['0x0'],
        signatures: ['execute()'],
        targets: [argv.payloadAddress],
        values: [0n],
        withDelegatecalls: [true],
      });
      const fork = await tenderly.fork(forkConfig);
      await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
    }
  }
};
