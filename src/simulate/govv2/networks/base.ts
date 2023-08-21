import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { getContract } from 'viem';
import { OPTIMISM_BRIDGE_EXECUTOR_ABI } from '../abis/OptimismBridgeExecutor';
import { baseClient } from '../../../utils/rpcClients';
import { getLogs } from '../../../utils/logs';
import { Trace, tenderly } from '../../../utils/tenderlyClient';
import { getProposalState, simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const BASE_L1_CROSS_DOMAIN_MESSENGER = '0x866E82a600A1414e583f7F13623F1aC5d58b0Afa';

const BASE_BRIDGE_EXECUTOR_START_BLOCK = 2135076n;

export const baseExecutorContract = getContract({
  address: AaveGovernanceV2.BASE_BRIDGE_EXECUTOR,
  abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
  publicClient: baseClient,
});

export const base: L2NetworkModule<typeof OPTIMISM_BRIDGE_EXECUTOR_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> = {
  name: 'Base',
  async cacheLogs() {
    const queuedLogs = await getLogs(baseClient, (fromBLock, toBlock) =>
      baseExecutorContract.createEventFilter.ActionsSetQueued(
        {},
        {
          fromBlock: fromBLock || BASE_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock || BASE_BRIDGE_EXECUTOR_START_BLOCK + 1n,
        }
      )
    );
    const executedLogs = await getLogs(baseClient, (fromBLock, toBlock) =>
      baseExecutorContract.createEventFilter.ActionsSetExecuted(
        {},
        {
          fromBlock: fromBLock || BASE_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock || BASE_BRIDGE_EXECUTOR_START_BLOCK + 1n,
        }
      )
    );

    return { queuedLogs, executedLogs };
  },
  findBridgeInMainnetCalls(calls) {
    return calls.reduce((acc, call) => {
      if (
        call.from?.toLowerCase() === BASE_L1_CROSS_DOMAIN_MESSENGER.toLowerCase() &&
        call.function_name == 'sendMessage'
      ) {
        return [...acc, call];
      }
      if (call.calls) {
        return [...acc, ...base.findBridgeInMainnetCalls(call.calls)];
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
      const tx = await baseClient.getTransaction({ hash: executedLog.transactionHash! });
      return tenderly.simulateTx(baseClient.chain.id, tx);
    }
    if (state === ActionSetState.QUEUED) {
      return simulateQueuedActionSet(baseExecutorContract, baseClient, queuedLog);
    }
    if (state === ActionSetState.NOT_FOUND) {
      return simulateNewActionSet(baseExecutorContract, baseClient, args);
    }
    throw new Error(`Unexpected ActionSetState: ${state}`);
  },
};
