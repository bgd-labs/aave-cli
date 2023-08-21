import { ContractFunctionResult, Hex, PublicClient, encodeFunctionData, getContract, toHex } from 'viem';
import { PAYLOADS_CONTROLLER_EXTENDED_ABI } from './abis/PayloadsControllerExtended';
import { getLogs } from '../../utils/logs';
import { FilterLogWithTimestamp } from '../govv2/networks/types';
import { TenderlyRequest, tenderly } from '../../utils/tenderlyClient';
import { TenderlySimulationResponse } from '../../../dist';
import { EOA } from '../../utils/constants';

type PayloadCreatedLog = FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadCreated'>;
type PayloadQueuedLog = FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadQueued'>;
type PayloadExecutedLog = FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadExecuted'>;

interface PayloadsController {
  // cache created / queued / Executed logs
  cacheLogs: () => Promise<{
    createdLogs: Array<PayloadCreatedLog>;
    queuedLogs: Array<PayloadQueuedLog>;
    executedLogs: Array<PayloadExecutedLog>;
  }>;
  // executes an existing payload
  getPayload: (
    id: number,
    logs: Awaited<ReturnType<PayloadsController['cacheLogs']>>
  ) => Promise<{
    payload: ContractFunctionResult<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'getPayloadById'>;
    createdLog: PayloadCreatedLog;
    queuedLog?: PayloadQueuedLog;
    executedLog?: PayloadExecutedLog;
  }>;
  simulatePayloadExecutionOnTenderly: (
    id: number,
    logs: Awaited<ReturnType<PayloadsController['getPayload']>>
  ) => Promise<TenderlySimulationResponse>;
  // creates and executes a payload
  // TODO: not sure yet about types etc
}

export const getPayloadsController = (
  address: Hex,
  publicClient: PublicClient,
  blockCreated?: bigint
): PayloadsController => {
  const controllerContract = getContract({ abi: PAYLOADS_CONTROLLER_EXTENDED_ABI, address, publicClient });
  return {
    cacheLogs: async () => {
      const createdLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return controllerContract.createEventFilter.PayloadCreated(
            {},
            {
              fromBlock: fromBlock,
              toBlock: toBlock,
            }
          );
        },
        blockCreated
      );
      const queuedLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return controllerContract.createEventFilter.PayloadQueued({
            fromBlock: fromBlock,
            toBlock: toBlock,
          });
        },
        blockCreated
      );
      const executedLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return controllerContract.createEventFilter.PayloadExecuted({
            fromBlock: fromBlock,
            toBlock: toBlock,
          });
        },
        blockCreated
      );
      return { createdLogs, queuedLogs, executedLogs };
    },
    getPayload: async (id, logs) => {
      const createdLog = logs.createdLogs.find((l) => l.args.payloadId === id)!;
      if (!createdLog) throw new Error(`Could not find payload ${id} on ${publicClient.chain!.id}`);
      const queuedLog = logs.queuedLogs.find((l) => l.args.payloadId === id);
      const executedLog = logs.executedLogs.find((l) => l.args.payloadId === id);
      const payload = await controllerContract.read.getPayloadById([id]);
      return { createdLog, queuedLog, executedLog, payload };
    },
    simulatePayloadExecutionOnTenderly: async (id, { executedLog, payload, queuedLog }) => {
      if (executedLog) {
        const tx = await publicClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(publicClient.chain!.id, tx);
      }
      const currentBlock = await publicClient.getBlock();
      const simulationPayload = {
        network_id: String(publicClient.chain!.id),
        from: EOA,
        to: controllerContract.address,
        input: encodeFunctionData({
          abi: PAYLOADS_CONTROLLER_EXTENDED_ABI,
          functionName: 'executePayload',
          args: [id],
        }),
        block_header: {
          timestamp: toHex(BigInt(payload.queuedAt + payload.gracePeriod)),
        },
      };
      if (queuedLog) {
      } else {
        // TODO: overwrite state so it's queued etc
      }

      return tenderly.simulate(simulationPayload);
    },
  };
};
