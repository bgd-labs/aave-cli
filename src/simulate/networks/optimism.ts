import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { Hex, decodeFunctionData, getContract } from 'viem';
import { OPTIMISM_BRIDGE_EXECUTOR_ABI, OPTIMISM_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/OptimismBridgeExecutor';
import { optimismClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace, tenderly } from '../../utils/tenderlyClient';
import { simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const OPTIMISM_L1_CROSS_COMAIN_MESSENGER = '0x25ace71c97B33Cc4729CF772ae268934F7ab5fA1';

const optimismExecutorContract = getContract({
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
    getProposalState({ trace, queuedLogs, executedLogs }) {
      const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_message').value as `0x${string}`;
      const { args } = decodeFunctionData({
        abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
        data: dataValue,
      });
      if (!args) throw new Error('Error: cannot decode trace');
      const queuedLog = queuedLogs.find((event) => JSON.stringify(event.args.targets) == JSON.stringify(args[0]));
      if (queuedLog) {
        const executedLog = executedLogs.find((event) => event.args.id == queuedLog.args.id);
        if (executedLog) {
          return { log: executedLog, state: ActionSetState.EXECUTED };
        } else {
          return { log: queuedLog, state: ActionSetState.QUEUED };
        }
      }
      return { state: ActionSetState.NOT_FOUND };
    },
    async simulateOnTenderly({ state, log, trace }) {
      if (state === ActionSetState.EXECUTED) {
        const tx = await optimismClient.getTransaction({ hash: log.transactionHash! });
        return tenderly.simulateTx(optimismClient.chain.id, tx);
      }
      if (state === ActionSetState.QUEUED) {
        return simulateQueuedActionSet(
          optimismExecutorContract,
          AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR,
          optimismClient,
          log
        );
      }
      if (state === ActionSetState.NOT_FOUND) {
        const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_message').value as Hex;
        const { functionName, args } = decodeFunctionData({
          abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
          data: dataValue,
        });
        return simulateNewActionSet(
          optimismExecutorContract,
          AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR,
          optimismClient,
          args
        );
      }
      throw new Error(`Unexpected ActionSetState: ${state}`);
    },
  };
