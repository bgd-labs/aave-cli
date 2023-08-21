import { Hex, PublicClient, getContract } from 'viem';
import { PAYLOADS_CONTROLLER_EXTENDED_ABI } from './abis/PayloadsControllerExtended';
import { getLogs } from '../../utils/logs';
import { FilterLogWithTimestamp } from '../govv2/networks/types';

interface PayloadsController {
  // cache created / queued / Executed logs
  cacheLogs: () => Promise<{
    createdLogs: Array<FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadCreated'>>;
    queuedLogs: Array<FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadQueued'>>;
    executedLogs: Array<FilterLogWithTimestamp<typeof PAYLOADS_CONTROLLER_EXTENDED_ABI, 'PayloadExecuted'>>;
  }>;
  // executes an existing payload
  simulateExecutionByIdOnTenderly: (id: bigint) => Promise<any>;
  // creates and executes a payload
  // TODO: not sure yet about types etc
}

export const getPayloadsController = (address: Hex, publicClient: PublicClient): PayloadsController => {
  const controllerContract = getContract({ abi: PAYLOADS_CONTROLLER_EXTENDED_ABI, address, publicClient });
  return {
    cacheLogs: async () => {
      const createdLogs = await getLogs(publicClient, (fromBLock, toBlock) => {
        return controllerContract.createEventFilter.PayloadCreated(
          {},
          {
            fromBlock: fromBLock,
            toBlock: toBlock,
          }
        );
      });
      const queuedLogs = await getLogs(publicClient, (fromBLock, toBlock) => {
        return controllerContract.createEventFilter.PayloadQueued({
          fromBlock: fromBLock,
          toBlock: toBlock,
        });
      });
      const executedLogs = await getLogs(publicClient, (fromBLock, toBlock) => {
        return controllerContract.createEventFilter.PayloadExecuted({
          fromBlock: fromBLock,
          toBlock: toBlock,
        });
      });
      return { createdLogs, queuedLogs, executedLogs };
    },
    simulateExecutionByIdOnTenderly: async (id: bigint) => {},
  };
};
