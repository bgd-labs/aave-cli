import {
  AbiStateMutability,
  ContractFunctionReturnType,
  GetContractReturnType,
  Hex,
  Client,
  encodeFunctionData,
  encodePacked,
  getContract,
} from 'viem';
import { TenderlyRequest, tenderly, TenderlySimulationResponse } from '../utils/tenderlyClient';
import { EOA } from '../utils/constants';
import { getSolidityStorageSlotUint } from '../utils/storageSlots';
import { IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import {
  PayloadCreatedEvent,
  PayloadExecutedEvent,
  PayloadQueuedEvent,
  findPayloadLogs,
  getPayloadsControllerEvents,
} from './cache/modules/payloadsController';
import { getBlock, getTransaction } from 'viem/actions';

export enum PayloadState {
  None,
  Created,
  Queued,
  Executed,
  Cancelled,
  Expired,
}

export const HUMAN_READABLE_PAYLOAD_STATE = {
  [PayloadState.None]: 'None',
  [PayloadState.Created]: 'Created',
  [PayloadState.Queued]: 'Queued',
  [PayloadState.Executed]: 'Executed',
  [PayloadState.Cancelled]: 'Cancelled',
  [PayloadState.Expired]: 'Expired',
};

export interface PayloadsController {
  controllerContract: GetContractReturnType<typeof IPayloadsControllerCore_ABI, Client>;
  // executes an existing payload
  getPayload: (
    id: number,
    logs: Awaited<ReturnType<typeof getPayloadsControllerEvents>>
  ) => Promise<{
    payload: ContractFunctionReturnType<typeof IPayloadsControllerCore_ABI, AbiStateMutability, 'getPayloadById'>;
    createdLog: PayloadCreatedEvent;
    queuedLog?: PayloadQueuedEvent;
    executedLog?: PayloadExecutedEvent;
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

export const getPayloadsController = (address: Hex, client: Client): PayloadsController => {
  const controllerContract = getContract({ abi: IPayloadsControllerCore_ABI, address, client });

  const getSimulationPayloadForExecution = async (id: number) => {
    const payload = await controllerContract.read.getPayloadById([id]);
    const currentBlock = await getBlock(client);
    const simulationPayload: TenderlyRequest = {
      network_id: String(client.chain!.id),
      from: EOA,
      to: controllerContract.address,
      input: encodeFunctionData({
        abi: IPayloadsControllerCore_ABI,
        functionName: 'executePayload',
        args: [id],
      }),
      block_number: -1,
      state_objects: {
        [controllerContract.address]: {
          storage: {
            [getSolidityStorageSlotUint(SLOTS.PAYLOADS_MAPPING, BigInt(id))]: encodePacked(
              ['uint40', 'uint40', 'uint8', 'uint8', 'address'],
              [
                // we substract 240n(4min), as tenderly might have been fallen behind
                // therefore using block_number -1 (latest on tenderly) and a 4min margin should give a save margin
                Number(currentBlock.timestamp - BigInt(payload.delay) - 1n - 240n), // altering queued time so can be executed in current block
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
    getPayload: async (id, logs) => {
      const payload = await controllerContract.read.getPayloadById([id]);
      const payloadLogs = await findPayloadLogs(logs, id);
      return { ...payloadLogs, payload };
    },
    getSimulationPayloadForExecution,
    simulatePayloadExecutionOnTenderly: async (id, { executedLog }) => {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await getTransaction(client, { hash: executedLog.transactionHash! });
        return tenderly.simulateTx(client.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(id);

      return tenderly.simulate(payload, client);
    },
  };
};
