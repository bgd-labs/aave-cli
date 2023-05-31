import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import { decodeAbiParameters, getContract } from 'viem';
import { polygonClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace, tenderly } from '../../utils/tenderlyClient';
import { POLYGON_BRIDGE_EXECUTOR_ABI, POLYGON_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/PolygonBridgeExecutor';
import { simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const POLYGON_FX_ROOT = '0xfe5e5D361b2ad62c541bAb87C45a0B9B018389a2';

const polygonExecutorContract = getContract({
  address: AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR,
  abi: POLYGON_BRIDGE_EXECUTOR_ABI,
  publicClient: polygonClient,
});

export const polygon: L2NetworkModule<typeof POLYGON_BRIDGE_EXECUTOR_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> = {
  name: 'Polygon',
  async cacheLogs() {
    const queuedLogs = await getLogs(polygonClient, (fromBLock, toBlock) =>
      polygonExecutorContract.createEventFilter.ActionsSetQueued({
        fromBlock: fromBLock || POLYGON_BRIDGE_EXECUTOR_START_BLOCK,
        toBlock: toBlock,
      })
    );
    const executedLogs = await getLogs(polygonClient, (fromBLock, toBlock) =>
      polygonExecutorContract.createEventFilter.ActionsSetExecuted(
        {},
        {
          fromBlock: fromBLock || POLYGON_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );

    return { queuedLogs, executedLogs };
  },
  findBridgeInMainnetCalls(calls) {
    return calls.reduce((acc, call) => {
      if (call.to?.toLowerCase() === POLYGON_FX_ROOT.toLowerCase() && call.function_name === 'sendMessageToChild') {
        return [...acc, call];
      }
      if (call.calls) {
        return [...acc, ...polygon.findBridgeInMainnetCalls(call.calls)];
      }
      return acc;
    }, [] as Array<Trace>);
  },
  getProposalState({ trace, queuedLogs, executedLogs }) {
    const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_data').value as `0x${string}`;
    const args = decodeAbiParameters(
      [
        { name: 'targets', type: 'address[]' },
        { name: 'values', type: 'uint256[]' },
        { name: 'signatures', type: 'string[]' },
        { name: 'calldatas', type: 'bytes[]' },
        { name: 'withDelegatecalls', type: 'bool[]' },
      ],
      dataValue
    );
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
      const tx = await polygonClient.getTransaction({ hash: log.transactionHash! });
      return tenderly.simulateTx(polygonClient.chain.id, tx);
    }
    if (state === ActionSetState.QUEUED) {
      return simulateQueuedActionSet(
        polygonExecutorContract,
        AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR,
        polygonClient,
        log
      );
    }
    if (state === ActionSetState.NOT_FOUND) {
      const dataValue = trace.decoded_input.find((input) => input.soltype.name === '_data').value as `0x${string}`;
      const args = decodeAbiParameters(
        [
          { name: 'targets', type: 'address[]' },
          { name: 'values', type: 'uint256[]' },
          { name: 'signatures', type: 'string[]' },
          { name: 'calldatas', type: 'bytes[]' },
          { name: 'withDelegatecalls', type: 'bool[]' },
        ],
        dataValue
      );
      return simulateNewActionSet(
        polygonExecutorContract,
        AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR,
        polygonClient,
        args
      );
    }
    throw new Error(`Unexpected ActionSetState: ${state}`);
  },
};
