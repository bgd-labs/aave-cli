import {IPayloadsControllerCore_ABI} from '@bgd-labs/aave-address-book';
import {
  type Client,
  type GetContractReturnType,
  type Hex,
  encodeFunctionData,
  encodePacked,
  getContract,
} from 'viem';
import {getBlock, getTransaction} from 'viem/actions';
import {EOA} from '../utils/constants';
import {getSolidityStorageSlotUint} from '../utils/storageSlots';
import {
  type TenderlyRequest,
  type TenderlySimulationResponse,
  tenderly,
} from '../utils/tenderlyClient';
import {GetPayloadReturnType, PayloadState} from '@bgd-labs/aave-v3-governance-cache';

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
  getSimulationPayloadForExecution: (id: number) => Promise<TenderlyRequest>;
  simulatePayloadExecutionOnTenderly: (
    id: number,
    logs: GetPayloadReturnType['logs'],
  ) => Promise<TenderlySimulationResponse>;
}

const SLOTS = {
  PAYLOADS_MAPPING: 3n,
};

export const getPayloadsController = (address: Hex, client: Client): PayloadsController => {
  const controllerContract = getContract({
    abi: IPayloadsControllerCore_ABI,
    address,
    client,
  });

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
      block_number: -2,
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
              ],
            ),
          },
        },
      },
    };
    return simulationPayload;
  };

  return {
    controllerContract,
    getSimulationPayloadForExecution,
    simulatePayloadExecutionOnTenderly: async (id, {executedLog}) => {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await getTransaction(client, {
          hash: executedLog.transactionHash!,
        });
        return tenderly.simulateTx(client.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(id);

      return tenderly.simulate(payload, client);
    },
  };
};
