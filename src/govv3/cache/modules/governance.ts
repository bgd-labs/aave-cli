import { IGovernanceCore_ABI } from '@bgd-labs/aave-address-book';
import { strategicGetLogs } from '@bgd-labs/js-utils';
import { Address, Client, getAbiItem } from 'viem';
import type { ExtractAbiEvent } from 'abitype';
import { getBlock } from 'viem/actions';
import { LogWithTimestamp } from '../../../utils/logs';

export type ProposalCreatedEvent = LogWithTimestamp<ExtractAbiEvent<typeof IGovernanceCore_ABI, 'ProposalCreated'>>;
export type ProposalQueuedEvent = LogWithTimestamp<ExtractAbiEvent<typeof IGovernanceCore_ABI, 'ProposalQueued'>>;
export type ProposalCanceledEvent = LogWithTimestamp<ExtractAbiEvent<typeof IGovernanceCore_ABI, 'ProposalCanceled'>>;
export type ProposalExecutedEvent = LogWithTimestamp<ExtractAbiEvent<typeof IGovernanceCore_ABI, 'ProposalExecuted'>>;
export type ProposalPayloadSentEvent = LogWithTimestamp<ExtractAbiEvent<typeof IGovernanceCore_ABI, 'PayloadSent'>>;
export type ProposalVotingActivatedEvent = LogWithTimestamp<
  ExtractAbiEvent<typeof IGovernanceCore_ABI, 'VotingActivated'>
>;

export enum ProposalState {
  Null, // proposal does not exists
  Created, // created, waiting for a cooldown to initiate the balances snapshot
  Active, // balances snapshot set, voting in progress
  Queued, // voting results submitted, but proposal is under grace period when guardian can cancel it
  Executed, // results sent to the execution chain(s)
  Failed, // voting was not successful
  Cancelled, // got cancelled by guardian, or because proposition power of creator dropped below allowed minimum
  Expired,
}

export function isProposalFinal(state: ProposalState) {
  return [ProposalState.Executed, ProposalState.Failed, ProposalState.Cancelled, ProposalState.Expired].includes(state);
}

export async function getGovernanceEvents(
  governanceAddress: Address,
  client: Client,
  fromBlockNumber: bigint,
  toBlockNumber: bigint
) {
  const logs = await strategicGetLogs({
    client,
    events: [
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'ProposalCreated' }),
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'ProposalQueued' }),
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'ProposalExecuted' }),
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'PayloadSent' }),
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'VotingActivated' }),
      getAbiItem({ abi: IGovernanceCore_ABI, name: 'ProposalCanceled' }),
    ],
    address: governanceAddress,
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

export async function findProposalLogs(logs: Awaited<ReturnType<typeof getGovernanceEvents>>, proposalId: bigint) {
  const proposalLogs = logs.filter((log) => String(log.args.proposalId) === String(proposalId));
  return {
    createdLog: proposalLogs.find((log) => log.eventName === 'ProposalCreated') as ProposalCreatedEvent,
    votingActivatedLog: proposalLogs.find((log) => log.eventName === 'VotingActivated') as ProposalVotingActivatedEvent,
    queuedLog: proposalLogs.find((log) => log.eventName === 'ProposalQueued') as ProposalQueuedEvent,
    executedLog: proposalLogs.find((log) => log.eventName === 'ProposalExecuted') as ProposalExecutedEvent,
    payloadSentLog: proposalLogs.filter((log) => log.eventName === 'PayloadSent') as ProposalPayloadSentEvent[],
    canceledLog: proposalLogs.find((log) => log.eventName === 'ProposalCanceled') as ProposalCanceledEvent,
  };
}
