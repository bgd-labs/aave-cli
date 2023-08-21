import {
  Abi,
  GetContractReturnType,
  GetFilterLogsReturnType,
  Hex,
  PublicClient,
  decodeFunctionData,
  encodeAbiParameters,
  encodeFunctionData,
  fromHex,
  keccak256,
  pad,
  toHex,
} from 'viem';
import { Trace, tenderly } from '../../../utils/tenderlyClient';
import { EOA } from '../../../utils/constants';
import {
  getBytesValue,
  getDynamicArraySlot,
  getSolidityStorageSlotBytes,
  getSolidityStorageSlotUint,
} from '../../../utils/storageSlots';
import { ActionSetState, FilterLogWithTimestamp, FormattedArgs } from './types';

/**
 * The executors are slightly different, but the execute signature is always the same
 */
const executorABI = [
  {
    inputs: [],
    name: 'getActionsSetCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGracePeriod',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiatorExecution',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes[]',
        name: 'returnedData',
        type: 'bytes[]',
      },
    ],
    name: 'ActionsSetExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'targets',
        type: 'address[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'string[]',
        name: 'signatures',
        type: 'string[]',
      },
      {
        indexed: false,
        internalType: 'bytes[]',
        name: 'calldatas',
        type: 'bytes[]',
      },
      {
        indexed: false,
        internalType: 'bool[]',
        name: 'withDelegatecalls',
        type: 'bool[]',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executionTime',
        type: 'uint256',
      },
    ],
    name: 'ActionsSetQueued',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'actionsSetId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'string[]', name: 'signatures', type: 'string[]' },
      { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
      { internalType: 'bool[]', name: 'withDelegatecalls', type: 'bool[]' },
    ],
    name: 'queue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export interface GetProposalStateProps<TAbi extends Abi> {
  queuedLogs: Array<FilterLogWithTimestamp<TAbi, 'ActionsSetQueued'>>;
  executedLogs: Array<FilterLogWithTimestamp<TAbi, 'ActionsSetExecuted'>>;
  dataValue: Hex;
  // earliest timestamp to look for events (latest mainnet event)
  fromTimestamp: number;
}

export function formatArgs(rawArgs: any): FormattedArgs {
  return {
    targets: rawArgs[0],
    values: rawArgs[1],
    signatures: rawArgs[2],
    calldatas: rawArgs[3],
    withDelegatecalls: rawArgs[4],
  };
}

export async function getProposalStateById({
  queuedLogs,
  executedLogs,
  proposalId,
}: GetProposalStateProps<typeof executorABI> & { proposalId: number }) {
  const queuedLog = queuedLogs.find((event) => Number(event.args.id) === Number(proposalId));
  if (queuedLog) {
    const executedLog = executedLogs.find((event) => Number(event.args.id) == Number(proposalId));
    if (executedLog) {
      return { executedLog: executedLog, queuedLog: queuedLog, state: ActionSetState.EXECUTED };
    } else {
      return { queuedLog: queuedLog, state: ActionSetState.QUEUED };
    }
  }
  return { state: ActionSetState.NOT_FOUND };
}

export async function getProposalState<TAbi>({
  queuedLogs,
  executedLogs,
  dataValue,
  fromTimestamp,
}: GetProposalStateProps<typeof executorABI>) {
  const { args: rawArgs } = decodeFunctionData({
    abi: executorABI,
    data: dataValue,
  });
  if (!rawArgs) throw new Error('Error: cannot decode trace');
  const args = formatArgs(rawArgs);
  const queuedLog = queuedLogs.find(
    (event) =>
      event.timestamp > fromTimestamp &&
      JSON.stringify(event.args.targets) == JSON.stringify(args.targets) &&
      JSON.stringify(event.args.calldatas) == JSON.stringify(args.calldatas)
  );
  if (queuedLog) {
    args.proposalId = queuedLog.args.id;
    const executedLog = executedLogs.find((event) => event.args.id == queuedLog.args.id);
    if (executedLog) {
      return { executedLog: executedLog, queuedLog: queuedLog, state: ActionSetState.EXECUTED, args };
    } else {
      return { queuedLog: queuedLog, state: ActionSetState.QUEUED, args };
    }
  }
  return { state: ActionSetState.NOT_FOUND, args };
}

export async function getTenderlyActionSetExecutionPayload(
  executorContract: GetContractReturnType<typeof executorABI, PublicClient>,
  client: PublicClient,
  log: any
) {
  const gracePeriod = await executorContract.read.getGracePeriod();
  const currentBlock = await client.getBlock();
  /**
   * When the proposal is expired, simulate one block after queuing
   * When the proposal could still be executed, simulate on current block
   */
  const simulationBlock =
    currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
      ? Number(log!.blockNumber) + 1
      : (currentBlock.number as bigint) - BigInt(1);

  const simulationPayload = {
    network_id: String(client.chain!.id),
    from: EOA,
    to: executorContract.address,
    block_number: Number(simulationBlock),
    input: encodeFunctionData({
      abi: executorABI,
      functionName: 'execute',
      args: [log!.args.id!],
    }),
    block_header: {
      timestamp: toHex(BigInt(log.args.executionTime!)),
    },
  };
  return simulationPayload;
}

export async function simulateQueuedActionSet(
  executorContract: GetContractReturnType<typeof executorABI, PublicClient>,
  client: PublicClient,
  log: any
) {
  const payload = await getTenderlyActionSetExecutionPayload(executorContract, client, log);
  return tenderly.simulate(payload);
}

export async function getTenderlyActionSetCreationPayload(
  executorContract: GetContractReturnType<typeof executorABI, PublicClient>,
  client: PublicClient,
  args: FormattedArgs
) {
  const latestBlock = await client.getBlock();
  const currentCount = await executorContract.read.getActionsSetCount();
  const actionSetHash = fromHex(getSolidityStorageSlotUint(6n, currentCount), 'bigint');
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
   * }
   */
  const proposalStorage: { [key: `0x${string}`]: number | string | boolean } = {};
  // targets
  proposalStorage[toHex(actionSetHash)] = pad(toHex(args.targets.length), { size: 32 });
  args.targets.map((target, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash, index, 1)] = pad(target, { size: 32 }) as Hex;
  });
  // values
  proposalStorage[toHex(actionSetHash + 1n)] = pad(toHex(args.values.length), { size: 32 });
  args.values.map((value, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash + 1n, index, 1)] = pad(toHex(value), { size: 32 });
  });
  // signatures
  proposalStorage[toHex(actionSetHash + 2n)] = pad(toHex(args.signatures.length), { size: 32 });
  args.signatures.map((signature, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash + 2n, index, 1)] = getBytesValue(signature);
  });
  // calldatas
  proposalStorage[toHex(actionSetHash + 3n)] = pad(toHex(args.calldatas.length), { size: 32 });
  args.calldatas.map((calldata, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash + 3n, index, 1)] = getBytesValue(calldata);
  });
  // withDelegateCalls
  proposalStorage[toHex(actionSetHash + 4n)] = pad(toHex(args.withDelegatecalls.length), { size: 32 });
  args.withDelegatecalls.map((withDelegateCalls, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash + 4n, index, 1)] = pad(toHex(withDelegateCalls), {
      size: 32,
    });
  });
  // executionTime
  proposalStorage[pad(toHex(actionSetHash + 5n), { size: 32 })] = pad(toHex(latestBlock.timestamp), { size: 32 });
  // queued hashes
  const hashes = args.targets.reduce((acc, target, index) => {
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
        [
          args.targets[index],
          args.values[index],
          args.signatures[index],
          args.calldatas[index],
          latestBlock.timestamp,
          args.withDelegatecalls[index],
        ]
      )
    );
    acc[getSolidityStorageSlotBytes(toHex(7), actionHash)] = pad(toHex(true), { size: 32 });
    return acc;
  }, {} as { [key: Hex]: Hex });

  const payload = {
    network_id: String(client.chain!.id),
    from: EOA,
    to: executorContract.address,
    state_objects: {
      [executorContract.address]: {
        storage: {
          // _actionsSetCounter slot
          [pad(toHex(5), { size: 32 })]: pad(toHex(currentCount + 1n), { size: 32 }),
          // _actionsSets
          ...proposalStorage,
          // _queuedActions
          ...hashes,
        },
      },
    },
    input: encodeFunctionData({
      abi: executorABI,
      functionName: 'execute',
      args: [currentCount],
    }),
    block_header: {
      timestamp: toHex(latestBlock.timestamp),
      number: toHex(latestBlock.number!),
    },
  };
  return payload;
}

export async function simulateNewActionSet(
  executorContract: GetContractReturnType<typeof executorABI, PublicClient>,
  client: PublicClient,
  args: FormattedArgs
) {
  const payload = await getTenderlyActionSetCreationPayload(executorContract, client, args);
  return tenderly.simulate(payload);
}
