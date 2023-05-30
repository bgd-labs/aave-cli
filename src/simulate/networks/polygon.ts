import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule } from './types';
import {
  decodeAbiParameters,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  fromHex,
  getContract,
  keccak256,
  pad,
  toHex,
} from 'viem';
import { polygonClient } from '../../utils/rpcClients';
import { getLogs } from '../../utils/logs';
import { Trace, tenderly } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import { POLYGON_BRIDGE_EXECUTOR_ABI, POLYGON_BRIDGE_EXECUTOR_START_BLOCK } from '../abis/PolygonBridgeExecutor';
import {
  getSolidityStorageSlotUint,
  getSolidityStorageSlotBytes,
  getDynamicArraySlot,
  getBytesValue,
} from '../../utils/storageSlots';

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
      return tenderly.trace(polygonClient.chain.id, log.transactionHash!);
    }
    if (state === ActionSetState.QUEUED) {
      const gracePeriod = await polygonExecutorContract.read.getGracePeriod();
      const currentBlock = await polygonClient.getBlock();
      /**
       * When the proposal is expired, simulate one block after queuing
       * When the proposal could still be executed, simulate on current block
       */
      const simulationBlock =
        currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
          ? Number(log!.blockNumber) + 1
          : (currentBlock.number as bigint) - BigInt(1);

      const simulationPayload = {
        network_id: String(polygonClient.chain.id),
        from: EOA,
        to: AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR,
        block_number: Number(simulationBlock),
        input: encodeFunctionData({
          abi: POLYGON_BRIDGE_EXECUTOR_ABI,
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
      const latestBlock = await polygonClient.getBlock();
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
      const currentCount = await polygonExecutorContract.read.getActionsSetCount();
      const hashes = args[0].reduce((acc, target, index) => {
        const actionHash = keccak256(
          encodeAbiParameters(
            [
              { name: 'target', type: 'address' },
              { name: 'value', type: 'uint256' },
              { name: 'signature', type: 'string' },
              { name: 'calldata', type: 'bytes' },
              { name: 'executionTime', type: 'uint256' },
              { name: 'withDelegatecall', type: 'bool' },
            ],
            [args[0][index], args[1][index], args[2][index], args[3][index], latestBlock.timestamp, args[4][index]]
          )
        );
        acc[getSolidityStorageSlotBytes(toHex(7), actionHash)] = pad(toHex(true), { size: 32 });
        return acc;
      }, {});

      /**
       * struct ActionsSet {
       *  address[] targets; //0
       *  uint256[] values; //1
       *  string[] signatures; //2
       *  bytes[] calldatas; //3
       *  bool[] withDelegatecalls; //4
       *  uint256 executionTime; //5
       *  bool executed; //6
       *  bool canceled;
       *}
       */
      const actionSetHash = fromHex(getSolidityStorageSlotUint(6n, currentCount), 'bigint');
      const proposalStorage: { [key: `0x${string}`]: number | string | boolean } = {};
      // targets
      proposalStorage[toHex(actionSetHash)] = pad(toHex(args[0].length), { size: 32 });
      args[0].map((target, index) => {
        proposalStorage[getDynamicArraySlot(actionSetHash, index, 1)] = pad(target, { size: 32 });
      });
      // values
      proposalStorage[toHex(actionSetHash + 1n)] = pad(toHex(args[1].length), { size: 32 });
      args[1].map((value, index) => {
        proposalStorage[getDynamicArraySlot(actionSetHash + 1n, index, 1)] = pad(toHex(value), { size: 32 });
      });
      // signatures
      proposalStorage[toHex(actionSetHash + 2n)] = pad(toHex(args[2].length), { size: 32 });
      args[2].map((signature, index) => {
        proposalStorage[getDynamicArraySlot(actionSetHash + 2n, index, 1)] = getBytesValue(signature);
      });
      // calldatas
      proposalStorage[toHex(actionSetHash + 3n)] = pad(toHex(args[3].length), { size: 32 });
      args[3].map((calldata, index) => {
        proposalStorage[getDynamicArraySlot(actionSetHash + 3n, index, 1)] = getBytesValue(calldata);
      });
      // withDelegateCalls
      proposalStorage[toHex(actionSetHash + 4n)] = pad(toHex(args[4].length), { size: 32 });
      args[4].map((withDelegateCalls, index) => {
        proposalStorage[getDynamicArraySlot(actionSetHash + 4n, index, 1)] = pad(toHex(withDelegateCalls), {
          size: 32,
        });
      });
      // executionTime
      proposalStorage[pad(toHex(actionSetHash + 5n), { size: 32 })] = pad(toHex(latestBlock.timestamp), { size: 32 });

      const simulationPayload = {
        network_id: String(polygonClient.chain.id),
        from: EOA,
        to: AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR,
        state_objects: {
          [AaveGovernanceV2.POLYGON_BRIDGE_EXECUTOR]: {
            storage: {
              // _actionsSetCounter slot
              [pad(toHex(5), { size: 32 })]: toHex(currentCount + 1n),
              // _actionsSets
              ...proposalStorage,
              // _queuedActions
              ...hashes,
            },
          },
        },
        input: encodeFunctionData({
          abi: POLYGON_BRIDGE_EXECUTOR_ABI,
          functionName: 'execute',
          args: [currentCount],
        }),
        block_header: {
          timestamp: toHex(latestBlock.timestamp),
          number: toHex(latestBlock.number!),
        },
      };

      return await tenderly.simulate(simulationPayload);
    }
  },
};
