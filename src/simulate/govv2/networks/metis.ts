import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { L2NetworkModule } from './types';
import { getContract } from 'viem';
import { METIS_BRIDGE_EXECUTOR_START_BLOCK, METIS_BRIDGE_EXECUTOR_ABI } from '../abis/MetisBridgeExecutor';
import { metisClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace } from '../../utils/tenderlyClient';
import { getProposalState } from './commonL2';
import { OPTIMISM_BRIDGE_EXECUTOR_ABI } from '../abis/OptimismBridgeExecutor';

const METIS_L1_CROSS_COMAIN_MESSENGER = '0x081D1101855bD523bA69A9794e0217F0DB6323ff';

const arbitrumExecutorContract = getContract({
  address: AaveGovernanceV2.METIS_BRIDGE_EXECUTOR,
  abi: METIS_BRIDGE_EXECUTOR_ABI,
  publicClient: metisClient,
});

export const metis: L2NetworkModule<typeof OPTIMISM_BRIDGE_EXECUTOR_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> = {
  name: 'Metis',
  async cacheLogs() {
    const queuedLogs = await getLogs(metisClient, (fromBLock, toBlock) =>
      arbitrumExecutorContract.createEventFilter.ActionsSetQueued(
        {},
        {
          fromBlock: fromBLock || METIS_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const executedLogs = await getLogs(metisClient, (fromBLock, toBlock) =>
      arbitrumExecutorContract.createEventFilter.ActionsSetExecuted(
        {},
        {
          fromBlock: fromBLock || METIS_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );

    return { queuedLogs, executedLogs };
  },
  findBridgeInMainnetCalls(calls) {
    return calls.reduce((acc, call) => {
      if (
        call.from?.toLowerCase() === METIS_L1_CROSS_COMAIN_MESSENGER.toLowerCase() &&
        call.function_name == 'sendMessage'
      ) {
        return [...acc, call];
      }
      if (call?.calls) {
        return [...acc, ...metis.findBridgeInMainnetCalls(call?.calls)];
      }
      return acc;
    }, [] as Array<Trace>);
  },
  getProposalState: (args) =>
    getProposalState({
      ...args,
      dataValue: args.trace.decoded_input.find((input) => input.soltype!.name === '_message')!.value as `0x${string}`,
    }),
  // Tenderly doesn't support metis
  // async simulateOnTenderly({ state, log, trace }) {
  //   if (state === ActionSetState.EXECUTED) {
  //     return tenderly.trace(metisClient.chain.id, log.transactionHash!);
  //   }
  //   if (state === ActionSetState.QUEUED) {
  //     const gracePeriod = await arbitrumExecutorContract.read.getGracePeriod();
  //     const currentBlock = await metisClient.getBlock();
  //     /**
  //      * When the proposal is expired, simulate one block after queuing
  //      * When the proposal could still be executed, simulate on current block
  //      */
  //     const simulationBlock =
  //       currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
  //         ? Number(log!.blockNumber) + 1
  //         : (currentBlock.number as bigint) - BigInt(1);

  //     const simulationPayload = {
  //       network_id: String(metisClient.chain.id),
  //       from: EOA,
  //       to: AaveGovernanceV2.METIS_BRIDGE_EXECUTOR,
  //       block_number: Number(simulationBlock),
  //       input: encodeFunctionData({
  //         abi: METIS_BRIDGE_EXECUTOR_ABI,
  //         functionName: 'execute',
  //         args: [log!.args.id!],
  //       }),
  //       block_header: {
  //         timestamp: toHex(BigInt(log.args.executionTime!)),
  //       },
  //     };
  //     return tenderly.simulate(simulationPayload);
  //   }
  //   if (state === ActionSetState.NOT_FOUND) {
  //     const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_message').value as `0x${string}`;
  //     const simulationPayload = {
  //       network_id: String(metisClient.chain.id),
  //       from: EOA,
  //       to: AaveGovernanceV2.METIS_BRIDGE_EXECUTOR,
  //       input: dataValue,
  //       state_objects: {
  //         [AaveGovernanceV2.METIS_BRIDGE_EXECUTOR]: {
  //           code: MOCK_EXECUTOR_BYTECODE,
  //         },
  //       },
  //     };
  //     const queueResult = await tenderly.simulate(simulationPayload);

  //     const queueState = queueResult.transaction.transaction_info.state_diff.reduce((acc, diff) => {
  //       diff.raw.forEach((raw) => {
  //         if (!acc[raw.address]) acc[raw.address] = { storage: {} };
  //         acc[raw.address].storage![raw.key] = raw.dirty;
  //       });
  //       return acc;
  //     }, {} as Record<string, StateObject>);
  //     queueState[AaveGovernanceV2.METIS_BRIDGE_EXECUTOR] = {
  //       code: MOCK_EXECUTOR_BYTECODE,
  //     };
  //     const id = queueResult.transaction.transaction_info.state_diff.find(
  //       (diff) =>
  //         diff.address.toLowerCase() === AaveGovernanceV2.METIS_BRIDGE_EXECUTOR.toLowerCase() &&
  //         diff.soltype?.name === '_actionsSetCounter'
  //     );

  //     return await tenderly.simulate({
  //       ...simulationPayload,
  //       state_objects: queueState,
  //       input: encodeFunctionData({
  //         abi: METIS_BRIDGE_EXECUTOR_ABI,
  //         functionName: 'execute',
  //         args: [id.original],
  //       }),
  //     });
  //   }
  // },
};
