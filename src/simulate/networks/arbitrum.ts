import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { decodeFunctionData, encodeFunctionData, getContract, toHex } from 'viem';
import { ARBITRUM_BRIDGE_EXECUTOR_ABI, ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/ArbitrumBridgeExecutor';
import { arbitrumClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { StateObject, Trace, tenderly } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import { MOCK_EXECUTOR_BYTECODE } from '../abis/MockExecutor';
import { simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

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
    getProposalState({ trace, queuedLogs, executedLogs }) {
      const dataValue = trace.decoded_input.find((input) => input.soltype.name === 'data').value as `0x${string}`;
      const { args } = decodeFunctionData({
        abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
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
        const tx = await arbitrumClient.getTransaction({ hash: log.transactionHash! });
        return tenderly.simulateTx(arbitrumClient.chain.id, tx);
      }
      if (state === ActionSetState.QUEUED) {
        return simulateQueuedActionSet(
          arbitrumExecutorContract,
          AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
          arbitrumClient,
          log
        );
      }
      if (state === ActionSetState.NOT_FOUND) {
        const dataValue = trace.decoded_input.find((input) => input.soltype.name === 'data').value as `0x${string}`;
        const { functionName, args } = decodeFunctionData({
          abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
          data: dataValue,
        });
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
