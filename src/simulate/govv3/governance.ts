import { ContractFunctionResult, Hex, PublicClient, getContract } from 'viem';
import { FilterLogWithTimestamp } from '../govv2/networks/types';
import { GOVERNANCE_EXTENDED_ABI } from './abis/GovernanceExtended';
import { getLogs } from '../../utils/logs';

type CreatedLog = FilterLogWithTimestamp<typeof GOVERNANCE_EXTENDED_ABI, 'ProposalCreated'>;
type QueuedLog = FilterLogWithTimestamp<typeof GOVERNANCE_EXTENDED_ABI, 'ProposalQueued'>;
type ExecutedLog = FilterLogWithTimestamp<typeof GOVERNANCE_EXTENDED_ABI, 'ProposalExecuted'>;
type PayloadSentLog = FilterLogWithTimestamp<typeof GOVERNANCE_EXTENDED_ABI, 'PayloadSent'>;

interface Governance {
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
    proposal: ContractFunctionResult<typeof GOVERNANCE_EXTENDED_ABI, 'getProposal'>;
    createdLog: CreatedLog;
    queuedLog?: QueuedLog;
    executedLog?: ExecutedLog;
    payloadSentLog: PayloadSentLog[];
  }>;
  simulateProposal: any;
}

export const getGovernance = (address: Hex, publicClient: PublicClient, blockCreated?: bigint): Governance => {
  const governanceContract = getContract({ abi: GOVERNANCE_EXTENDED_ABI, address, publicClient });

  return {
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