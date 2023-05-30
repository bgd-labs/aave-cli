import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { decodeFunctionData, encodeFunctionData, getContract, toHex } from 'viem';
import { OPTIMISM_BRIDGE_EXECUTOR_ABI, OPTIMISM_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/OptimismBridgeExecutor';
import { optimismClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { StateObject, Trace, tenderly } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import { MOCK_EXECUTOR_BYTECODE } from '../abis/MockExecutor';

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
        return tenderly.trace(optimismClient.chain.id, log.transactionHash!);
      }
      if (state === ActionSetState.QUEUED) {
        const gracePeriod = await optimismExecutorContract.read.getGracePeriod();
        const currentBlock = await optimismClient.getBlock();
        /**
         * When the proposal is expired, simulate one block after queuing
         * When the proposal could still be executed, simulate on current block
         */
        const simulationBlock =
          currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
            ? Number(log!.blockNumber) + 1
            : (currentBlock.number as bigint) - BigInt(1);

        const simulationPayload = {
          network_id: String(optimismClient.chain.id),
          from: EOA,
          to: AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR,
          block_number: Number(simulationBlock),
          input: encodeFunctionData({
            abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
            functionName: 'execute',
            args: [log!.args.id!],
          }),
          block_header: {
            timestamp: toHex(BigInt(log.args.executionTime!)),
          },
        };
        return tenderly.simulate(simulationPayload);
      }
      if (state === ActionSetState.NOT_FOUND) {
        const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_message').value as `0x${string}`;
        const simulationPayload = {
          network_id: String(optimismClient.chain.id),
          from: EOA,
          to: AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR,
          input: dataValue,
          state_objects: {
            [AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR]: {
              code: MOCK_EXECUTOR_BYTECODE,
            },
          },
        };
        const queueResult = await tenderly.simulate(simulationPayload);

        const queueState = queueResult.transaction.transaction_info.state_diff.reduce((acc, diff) => {
          diff.raw.forEach((raw) => {
            if (!acc[raw.address]) acc[raw.address] = { storage: {} };
            acc[raw.address].storage![raw.key] = raw.dirty;
          });
          return acc;
        }, {} as Record<string, StateObject>);
        queueState[AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR] = {
          code: MOCK_EXECUTOR_BYTECODE,
        };
        const id = queueResult.transaction.transaction_info.state_diff.find(
          (diff) =>
            diff.address.toLowerCase() === AaveGovernanceV2.OPTIMISM_BRIDGE_EXECUTOR.toLowerCase() &&
            diff.soltype?.name === '_actionsSetCounter'
        );

        return await tenderly.simulate({
          ...simulationPayload,
          state_objects: queueState,
          input: encodeFunctionData({
            abi: OPTIMISM_BRIDGE_EXECUTOR_ABI,
            functionName: 'execute',
            args: [id.original],
          }),
        });
      }
    },
  };
