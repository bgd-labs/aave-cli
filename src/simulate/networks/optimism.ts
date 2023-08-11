import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { getContract } from 'viem';
import { OPTIMISM_BRIDGE_EXECUTOR_ABI, OPTIMISM_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/OptimismBridgeExecutor';
import { mainnetClient, optimismClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace, tenderly } from '../../utils/tenderlyClient';
import { getProposalState, simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const OPTIMISM_L1_CROSS_COMAIN_MESSENGER = '0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1';

export const optimismExecutorContract = getContract({
  address: AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR,
  abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
  publicClient: optimismClient,
});

export const optimism: L2NetworkModule<typeof OPTIMISM_BRIDGE_EXECUTOR_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> =
  {
    name: 'Optimism',
    async cacheLogs() {
      const queuedLogs = await getLogs(optimismClient, (fromBLock, toBlock) =>
        optimismExecutorContract.createEventFilter.ActionsSetQueued(
          {},
          {
            fromBlock: fromBLock || OPTIMISM_BRIDGE_EXECUTOR_START_BLOCK,
            toBlock: toBlock,
          }
        )
      );
      const executedLogs = await getLogs(optimismClient, (fromBLock, toBlock) =>
        optimismExecutorContract.createEventFilter.ActionsSetExecuted(
          {},
          {
            fromBlock: fromBLock || OPTIMISM_BRIDGE_EXECUTOR_START_BLOCK,
            toBlock: toBlock,
          }
        )
      );

      return { queuedLogs, executedLogs };
    },
    findBridgeInMainnetCalls(calls) {
      return calls.reduce((acc, call) => {
        if (
          call.from?.toLowerCase() === OPTIMISM_L1_CROSS_COMAIN_MESSENGER.toLowerCase() &&
          call.function_name == 'sendMessage'
        ) {
          return [...acc, call];
        }
        if (call.calls) {
          return [...acc, ...optimism.findBridgeInMainnetCalls(call.calls)];
        }
        return acc;
      }, [] as Array<Trace>);
    },
    getProposalState: ({ trace, ...args }) =>
      getProposalState({
        ...args,
        dataValue: trace.decoded_input.find((input) => input.soltype!.name === '_message')!.value as `0x${string}`,
      }),
    async simulateOnTenderly({ state, executedLog, queuedLog, args }) {
      if (state === ActionSetState.EXECUTED) {
        const tx = await optimismClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(optimismClient.chain.id, tx);
      }
      if (state === ActionSetState.QUEUED) {
        return simulateQueuedActionSet(optimismExecutorContract, optimismClient, queuedLog);
      }
      if (state === ActionSetState.NOT_FOUND) {
        return simulateNewActionSet(optimismExecutorContract, optimismClient, args);
      }
      throw new Error(`Unexpected ActionSetState: ${state}`);
    },
  };
