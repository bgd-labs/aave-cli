import { Hex, PublicClient, encodeAbiParameters, encodeFunctionData, fromHex, keccak256, pad, toHex } from 'viem';
import { tenderly } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import {
  getBytesValue,
  getDynamicArraySlot,
  getSolidityStorageSlotBytes,
  getSolidityStorageSlotUint,
} from '../../utils/storageSlots';

/**
 * The executors are slightly different, but the execute signature is always the same
 */
const executorABI = [
  {
    inputs: [{ internalType: 'uint256', name: 'actionsSetId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

export async function simulateQueuedActionSet(executorContract, executorAddress: Hex, client: PublicClient, log) {
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
    to: executorAddress,
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
  return tenderly.simulate(simulationPayload);
}

export async function simulateNewActionSet(executorContract, executorAddress: Hex, client: PublicClient, args) {
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
  proposalStorage[toHex(actionSetHash)] = pad(toHex(args[0].length), { size: 32 });
  args[0].map((target, index) => {
    proposalStorage[getDynamicArraySlot(actionSetHash, index, 1)] = pad(target, { size: 32 }) as Hex;
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

  return tenderly.simulate({
    network_id: String(client.chain!.id),
    from: EOA,
    to: executorAddress,
    state_objects: {
      [executorAddress]: {
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
      abi: executorABI,
      functionName: 'execute',
      args: [currentCount],
    }),
    block_header: {
      timestamp: toHex(latestBlock.timestamp),
      number: toHex(latestBlock.number!),
    },
  });
}
