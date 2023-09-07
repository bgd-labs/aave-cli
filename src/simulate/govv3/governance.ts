import {
  ContractFunctionResult,
  GetContractReturnType,
  Hex,
  PublicClient,
  WalletClient,
  encodeFunctionData,
  fromHex,
  getContract,
  parseEther,
  toHex,
} from 'viem';
import { FilterLogWithTimestamp } from '../govv2/networks/types';
import { getLogs } from '../../utils/logs';
import { IGovernanceCore_ABI } from '@bgd-labs/aave-address-book';
import { TenderlyRequest, TenderlySimulationResponse, tenderly } from '../../utils/tenderlyClient';
import { EOA } from '../../utils/constants';
import { getSolidityStorageSlotUint } from '../../utils/storageSlots';
import { setBits } from './utils/solidityUtils';

type CreatedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalCreated'>;
type QueuedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalQueued'>;
type ExecutedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalExecuted'>;
type PayloadSentLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'PayloadSent'>;
type VotingActivatedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'VotingActivated'>;

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

export interface Governance<T extends WalletClient | undefined> {
  governanceContract: GetContractReturnType<typeof IGovernanceCore_ABI, PublicClient, WalletClient>;
  cacheLogs: () => Promise<{
    createdLogs: Array<CreatedLog>;
    queuedLogs: Array<QueuedLog>;
    executedLogs: Array<ExecutedLog>;
    payloadSentLogs: Array<PayloadSentLog>;
    votingActivatedLogs: Array<VotingActivatedLog>;
  }>;
  getProposal: (
    proposalId: bigint,
    logs: Awaited<ReturnType<Governance<T>['cacheLogs']>>
  ) => Promise<{
    proposal: ContractFunctionResult<typeof IGovernanceCore_ABI, 'getProposal'>;
    createdLog: CreatedLog;
    queuedLog?: QueuedLog;
    executedLog?: ExecutedLog;
    votingActivatedLog?: VotingActivatedLog;
    payloadSentLog: PayloadSentLog[];
  }>;
  getSimulationPayloadForExecution: (proposalId: bigint) => Promise<TenderlyRequest>;
  simulateProposalExecutionOnTenderly: (
    proposalId: bigint,
    params: { executedLog?: ExecutedLog }
  ) => Promise<TenderlySimulationResponse>;
}

const SLOTS = {
  PROPOSALS_MAPPING: 7n,
};

export enum State {
  Null, // proposal does not exists
  Created, // created, waiting for a cooldown to initiate the balances snapshot
  Active, // balances snapshot set, voting in progress
  Queued, // voting results submitted, but proposal is under grace period when guardian can cancel it
  Executed, // results sent to the execution chain(s)
  Failed, // voting was not successful
  Cancelled, // got cancelled by guardian, or because proposition power of creator dropped below allowed minimum
  Expired,
}

interface GetGovernanceParams {
  address: Hex;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  blockCreated?: bigint;
}

export const getGovernance = ({
  address,
  publicClient,
  blockCreated,
  walletClient,
}: GetGovernanceParams): Governance<typeof walletClient> => {
  const governanceContract = getContract({ abi: IGovernanceCore_ABI, address, publicClient, walletClient });

  async function getSimulationPayloadForExecution(proposalId: bigint) {
    const currentBlock = await publicClient.getBlock();
    const proposalSlot = getSolidityStorageSlotUint(SLOTS.PROPOSALS_MAPPING, proposalId);
    const data = await publicClient.getStorageAt({
      address: governanceContract.address,
      slot: proposalSlot,
    });
    let bigIntData = fromHex(data!, { to: 'bigint' });
    // manipulate storage
    // set queued
    bigIntData = setBits(bigIntData, 0n, 8n, State.Queued);
    // set creation time
    bigIntData = setBits(
      bigIntData,
      16n,
      56n,
      currentBlock.timestamp - (await governanceContract.read.PROPOSAL_EXPIRATION_TIME())
    );
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
            [proposalSlot]: toHex(bigIntData),
          },
        },
      },
    };
    return simulationPayload;
  }

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
      const votingActivatedLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.VotingActivated(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        blockCreated
      );
      return { createdLogs, queuedLogs, executedLogs, payloadSentLogs, votingActivatedLogs };
    },
    async getProposal(proposalId, logs) {
      const proposal = await governanceContract.read.getProposal([proposalId]);
      const createdLog = logs.createdLogs.find((log) => String(log.args.proposalId) === proposalId.toString())!;
      const votingActivatedLog = logs.votingActivatedLogs.find(
        (log) => String(log.args.proposalId) === proposalId.toString()
      )!;
      const queuedLog = logs.queuedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const executedLog = logs.executedLogs.find((log) => String(log.args.proposalId) === proposalId.toString());
      const payloadSentLog = logs.payloadSentLogs.filter(
        (log) => String(log.args.proposalId) === proposalId.toString()
      );
      return { proposal, createdLog, votingActivatedLog, queuedLog, executedLog, payloadSentLog };
    },
    getSimulationPayloadForExecution,
    async simulateProposalExecutionOnTenderly(proposalId, { executedLog }) {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await publicClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(publicClient.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(proposalId);
      return tenderly.simulate(payload);
    },
  };
};
