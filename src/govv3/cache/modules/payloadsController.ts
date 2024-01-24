import { IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import { strategicGetLogs } from '@bgd-labs/js-utils';
import { Address, Client, getAbiItem } from 'viem';
import { getBlock } from 'viem/actions';
import type { ExtractAbiEvent } from 'abitype';
import { LogWithTimestamp } from '../../../utils/logs';

export type PayloadCreatedEvent = LogWithTimestamp<
  ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadCreated'>
>;
export type PayloadQueuedEvent = LogWithTimestamp<ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadQueued'>>;
export type PayloadExecutedEvent = LogWithTimestamp<
  ExtractAbiEvent<typeof IPayloadsControllerCore_ABI, 'PayloadExecuted'>
>;

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

export function isPayloadFinal(state: number) {
  return [
    PayloadState.Cancelled,
    PayloadState.Executed,
    PayloadState.Expired,
    // -1, // error
  ].includes(state);
}

export async function getPayloadsControllerEvents(
  payloadsControllerAddress: Address,
  client: Client,
  fromBlockNumber: bigint,
  toBlockNumber: bigint
) {
  const logs = await strategicGetLogs({
    client,
    events: [
      getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadCreated' }),
      getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadQueued' }),
      getAbiItem({ abi: IPayloadsControllerCore_ABI, name: 'PayloadExecuted' }),
    ],
    address: payloadsControllerAddress,
    fromBlock: fromBlockNumber,
    toBlock: toBlockNumber,
  });
  return await Promise.all(
    logs.map(async (l) => ({
      ...l,
      timestamp: Number((await getBlock(client, { blockNumber: l.blockNumber as bigint })).timestamp),
    }))
  );
}

export async function findPayloadLogs(
  logs: Awaited<ReturnType<typeof getPayloadsControllerEvents>>,
  payloadId: number
) {
  const proposalLogs = logs.filter((log) => String(log.args.payloadId) === String(payloadId));
  return {
    createdLog: proposalLogs.find((log) => log.eventName === 'PayloadCreated') as PayloadCreatedEvent,
    queuedLog: proposalLogs.find((log) => log.eventName === 'PayloadQueued') as PayloadQueuedEvent,
    executedLog: proposalLogs.find((log) => log.eventName === 'PayloadExecuted') as PayloadExecutedEvent,
  };
}
