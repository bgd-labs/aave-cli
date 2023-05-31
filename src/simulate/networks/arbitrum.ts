import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { getContract } from 'viem';
import { ARBITRUM_BRIDGE_EXECUTOR_ABI, ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/ArbitrumBridgeExecutor';
import { arbitrumClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace, tenderly } from '../../utils/tenderlyClient';
import { getProposalState, simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const ARBITRUM_INBOX = '0x4Dbd4fc535Ac27206064B68FfCf827b0A60BAB3f'; // TODO: should probably be on address-book

const arbitrumExecutorContract = getContract({
  address: AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
  abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
  publicClient: arbitrumClient,
});

export const arbitrum: L2NetworkModule<typeof ARBITRUM_BRIDGE_EXECUTOR_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> =
  {
    name: 'Arbitrum',
    async cacheLogs() {
      const queuedLogs = await getLogs(arbitrumClient, (fromBLock, toBlock) =>
        arbitrumExecutorContract.createEventFilter.ActionsSetQueued(
          {},
          {
            fromBlock: fromBLock || ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
            toBlock: toBlock,
          }
        )
      );
      const executedLogs = await getLogs(arbitrumClient, (fromBLock, toBlock) =>
        arbitrumExecutorContract.createEventFilter.ActionsSetExecuted(
          {},
          {
            fromBlock: fromBLock || ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
            toBlock: toBlock,
          }
        )
      );

      return { queuedLogs, executedLogs };
    },
    findBridgeInMainnetCalls(calls) {
      return calls.reduce((acc, call) => {
        if (
          call.to?.toLowerCase() === ARBITRUM_INBOX.toLowerCase() &&
          call.function_name === 'unsafeCreateRetryableTicket'
        ) {
          return [...acc, call];
        }
        if (call?.calls) {
          return [...acc, ...arbitrum.findBridgeInMainnetCalls(call?.calls)];
        }
        return acc;
      }, [] as Array<Trace>);
    },
    getProposalState: (args) =>
      getProposalState({
        ...args,
        dataValue: args.trace.decoded_input.find((input) => input.soltype.name === 'data').value as `0x${string}`,
      }),
    async simulateOnTenderly({ state, executedLog, queuedLog, args }) {
      if (state === ActionSetState.EXECUTED) {
        const tx = await arbitrumClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(arbitrumClient.chain.id, tx);
      }
      if (state === ActionSetState.QUEUED) {
        return simulateQueuedActionSet(
          arbitrumExecutorContract,
          AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
          arbitrumClient,
          queuedLog
        );
      }
      if (state === ActionSetState.NOT_FOUND) {
        return simulateNewActionSet(
          arbitrumExecutorContract,
          AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
          arbitrumClient,
          args
        );
      }
      throw new Error(`Unexpected ActionSetState: ${state}`);
    },
  };
