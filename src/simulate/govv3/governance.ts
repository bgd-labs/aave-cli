import {
  ContractFunctionResult,
  GetContractReturnType,
  Hex,
  PublicClient,
  encodeFunctionData,
  formatUnits,
  getContract,
  parseEther,
} from 'viem';
import { FilterLogWithTimestamp } from '../govv2/networks/types';
import { getLogs } from '../../utils/logs';
import { IGovernanceCore_ABI } from '@bgd-labs/aave-address-book';
import { TenderlyRequest } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import { getSolidityStorageSlotUint } from '../../utils/storageSlots';

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
  getSimulationPayloadForExecution: (proposalId: bigint) => Promise<TenderlyRequest>;
  simulateProposal: any;
}

const SLOTS = {
  PROPOSALS_MAPPING: 7n,
};

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
    async getProposal(proposalId, logs) {
      const proposal = await governanceContract.read.getProposal([proposalId]);
      const createdLog = logs.createdLogs.find((log) => String(log.args.proposalId) === proposalId.toString())!;
      const queuedLog = logs.queuedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const executedLog = logs.executedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const payloadSentLog = logs.payloadSentLogs.filter(
        (log) => String(log.args.proposalId) === proposalId.toString()
      );
      return { proposal, createdLog, queuedLog, executedLog, payloadSentLog };
    },
    async getSimulationPayloadForExecution(proposalId: bigint) {
      const proposal = await governanceContract.read.getProposal([proposalId]);
      const currentBlock = await publicClient.getBlock();
      const simulationPayload: TenderlyRequest = {
        network_id: String(publicClient.chain!.id),
        from: EOA,
        to: governanceContract.address,
        input: encodeFunctionData({
          abi: IGovernanceCore_ABI,
          functionName: 'executeProposal',
          args: [proposalId],
        }),
        value: parseEther('0.5').toString(),
        block_number: Number(currentBlock.number),
        state_objects: {
          [governanceContract.address]: {
            storage: {
              [getSolidityStorageSlotUint(SLOTS.PROPOSALS_MAPPING, proposalId)]: '0x0',
            },
          },
        },
      };
      return simulationPayload;
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
