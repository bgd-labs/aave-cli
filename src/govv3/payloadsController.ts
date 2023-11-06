import {
  ContractFunctionResult,
  GetContractReturnType,
  Hex,
  PublicClient,
  encodeFunctionData,
  encodePacked,
  getAbiItem,
  getContract,
} from 'viem';
import { LogWithTimestamp, getLogs } from '../utils/logs';
import { TenderlyRequest, tenderly, TenderlySimulationResponse } from '../utils/tenderlyClient';
import { EOA } from '../utils/constants';
import { getSolidityStorageSlotUint } from '../utils/storageSlots';
import { IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import type { ExtractAbiEvent } from 'abitype';

type PayloadCreatedEvent = ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadCreated'>;
type PayloadQueuedEvent = ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadQueued'>;
type PayloadExecutedEvent = ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadExecuted'>;

type PayloadCreatedLog = LogWithTimestamp<PayloadCreatedEvent>;
type PayloadQueuedLog = LogWithTimestamp<PayloadQueuedEvent>;
type PayloadExecutedLog = LogWithTimestamp<PayloadExecutedEvent>;

export enum PayloadState {
  None,
  Created,
  Queued,
  Executed,
  Cancelled,
  Expired,
}

export interface PayloadsController {
  controllerContract: GetContractReturnType<typeof IPayloadsControllerCore_ABI, PublicClient>;
  // cache created / queued / Executed logs
  cacheLogs: (searchStartBlock?: bigint) => Promise<{
    createdLogs: PayloadCreatedLog[];
    queuedLogs: PayloadQueuedLog[];
    executedLogs: PayloadExecutedLog[];
  }>;
  // executes an existing payload
  getPayload: (
    id: number,
    logs: Awaited<ReturnType<PayloadsController['cacheLogs']>>
  ) => Promise<{
    payload: ContractFunctionResult<typeof IPayloadsControllerCore_ABI, 'getPayloadById'>;
    createdLog: PayloadCreatedLog;
    queuedLog?: PayloadQueuedLog;
    executedLog?: PayloadExecutedLog;
  }>;
  getSimulationPayloadForExecution: (id: number) => Promise<TenderlyRequest>;
  simulatePayloadExecutionOnTenderly: (
    id: number,
    logs: Awaited<ReturnType<PayloadsController['getPayload']>>
  ) => Promise<TenderlySimulationResponse>;
  // creates and executes a payload
  // TODO: not sure yet about types etc
}

const SLOTS = {
  PAYLOADS_MAPPING: 3n,
};

export const getPayloadsController = (address: Hex, publicClient: PublicClient): PayloadsController => {
  const controllerContract = getContract({ abi: IPayloadsControllerCore_ABI, address, publicClient });

  const getSimulationPayloadForExecution = async (id: number) => {
    const payload = await controllerContract.read.getPayloadById([id]);
    const currentBlock = await publicClient.getBlock();
    const simulationPayload: TenderlyRequest = {
      network_id: String(publicClient.chain!.id),
      from: EOA,
      to: controllerContract.address,
      input: encodeFunctionData({
        abi: IPayloadsControllerCore_ABI,
        functionName: 'executePayload',
        args: [id],
      }),
      block_number: Number(currentBlock.number),
      state_objects: {
        [controllerContract.address]: {
          storage: {
            [getSolidityStorageSlotUint(SLOTS.PAYLOADS_MAPPING, BigInt(id))]: encodePacked(
              ['uint40', 'uint40', 'uint8', 'uint8', 'address'],
              [
                Number(currentBlock.timestamp - BigInt(payload.delay) - 1n), // altering queued time so can be executed in current block
                payload.createdAt,
                PayloadState.Queued,
                payload.maximumAccessLevelRequired,
                payload.creator,
              ]
            ),
          },
        },
      },
    };
    return simulationPayload;
  };

  return {
    controllerContract,
    cacheLogs: async (searchStartBlock) => {
      const logs = await getLogs(
        publicClient,
        [
          getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadCreated' }),
          getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadQueued' }),
          getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadExecuted' }),
        ],
        address,
        searchStartBlock
      );
      const createdLogs = logs.filter((log) => log.eventName === 'PayloadCreated') as PayloadCreatedLog[];
      const queuedLogs = logs.filter((log) => log.eventName === 'PayloadQueued') as PayloadQueuedLog[];
      const executedLogs = logs.filter((log) => log.eventName === 'PayloadExecuted') as PayloadExecutedLog[];

      return {
        createdLogs,
        queuedLogs,
        executedLogs,
      };
    },
    getPayload: async (id, logs) => {
      const createdLog = logs.createdLogs.find((l) => l.args.payloadId === id)!;
      if (!createdLog) throw new Error(`Could not find payload ${id} on ${publicClient.chain!.id}`);
      const queuedLog = logs.queuedLogs.find((l) => l.args.payloadId === id);
      const executedLog = logs.executedLogs.find((l) => l.args.payloadId === id);
      const payload = await controllerContract.read.getPayloadById([id]);
      return { createdLog, queuedLog, executedLog, payload };
    },
    getSimulationPayloadForExecution,
    simulatePayloadExecutionOnTenderly: async (id, { executedLog }) => {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await publicClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(publicClient.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(id);

      return tenderly.simulate(payload);
    },
  };
};
