import { ContractFunctionResult, GetContractReturnType, Hex, PublicClient, getContract } from 'viem';
import { FilterLogWithTimestamp } from '../govv2/networks/types';
import { getLogs } from '../../utils/logs';
import { IGovernanceCore_ABI } from '@bgd-labs/aave-address-book';

type CreatedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalCreated'>;
type QueuedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalQueued'>;
type ExecutedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalExecuted'>;
type PayloadSentLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'PayloadSent'>;

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

export interface Governance {
  governanceContract: GetContractReturnType<typeof IGovernanceCore_ABI, PublicClient>;
  cacheLogs: () => Promise<{
    createdLogs: Array<CreatedLog>;
    queuedLogs: Array<QueuedLog>;
    executedLogs: Array<ExecutedLog>;
    payloadSentLogs: Array<PayloadSentLog>;
  }>;
  getProposal: (
    proposalId: bigint,
    logs: Awaited<ReturnType<Governance['cacheLogs']>>
  ) => Promise<{
    proposal: ContractFunctionResult<typeof IGovernanceCore_ABI, 'getProposal'>;
    createdLog: CreatedLog;
    queuedLog?: QueuedLog;
    executedLog?: ExecutedLog;
    payloadSentLog: PayloadSentLog[];
  }>;
  simulateProposal: any;
}

export const getGovernance = (address: Hex, publicClient: PublicClient, blockCreated?: bigint): Governance => {
  const governanceContract = getContract({ abi: IGovernanceCore_ABI, address, publicClient });

  return {
    governanceContract,
    async cacheLogs() {
      const createdLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.ProposalCreated(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        blockCreated
      );
      const queuedLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.ProposalQueued(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        blockCreated
      );
      const executedLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.ProposalExecuted(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        blockCreated
      );
      const payloadSentLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.PayloadSent(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        blockCreated
      );
      return { createdLogs, queuedLogs, executedLogs, payloadSentLogs };
    },
    async getProposal(proposalId: bigint, logs: Awaited<ReturnType<Governance['cacheLogs']>>) {
      const proposal = await governanceContract.read.getProposal([proposalId]);
      const createdLog = logs.createdLogs.find((log) => String(log.args.proposalId) === proposalId.toString())!;
      const queuedLog = logs.queuedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const executedLog = logs.executedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const payloadSentLog = logs.payloadSentLogs.filter(
        (log) => String(log.args.proposalId) === proposalId.toString()
      );
      return { proposal, createdLog, queuedLog, executedLog, payloadSentLog };
    },
    // TODO
    async simulateProposal() {
      // # if executed just replay the txn
      // # if queued
      // 1. alter storage so it can be executed
      // 2. execute
      // # if created
      // 1. alter storage so it's queued and can be executed
      // 2. execute
      // # if cancelled
      // fork before cancelling & apply same rules as before
    },
  };
};
