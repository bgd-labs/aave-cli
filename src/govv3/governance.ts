import {
  ContractFunctionResult,
  GetContractReturnType,
  Hex,
  PublicClient,
  WalletClient,
  encodeFunctionData,
  fromHex,
  getContract,
  toHex,
} from 'viem';
import merge from 'deepmerge';
import { FilterLogWithTimestamp, getLogs } from '../utils/logs';
import { IGovernanceCore_ABI } from '@bgd-labs/aave-address-book';
import { TenderlyRequest, TenderlySimulationResponse, tenderly } from '../utils/tenderlyClient';
import { EOA } from '../utils/constants';
import {
  getSolidityStorageSlotAddress,
  getSolidityStorageSlotBytes,
  getSolidityStorageSlotUint,
} from '../utils/storageSlots';
import { setBits } from '../utils/storageSlots';
import { Proof, VOTING_SLOTS, WAREHOUSE_SLOTS, getAccountRPL, getProof } from './proofs';
import { readJSONCache, writeJSONCache } from '../utils/cache';
import { logInfo } from '../utils/logger';

// TODO remove once final
const AaveSafetyModule = { STK_AAVE: '0x1406A9Ea2B0ec8FD4bCa4F876DAae2a70a9856Ec' } as const;

type CreatedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalCreated'>;
type QueuedLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalQueued'>;
type CanceledLog = FilterLogWithTimestamp<typeof IGovernanceCore_ABI, 'ProposalCanceled'>;
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

function isStateFinal(state: ProposalState) {
  return [ProposalState.Executed, ProposalState.Failed, ProposalState.Cancelled, ProposalState.Expired].includes(state);
}

export interface Governance<T extends WalletClient | undefined = undefined> {
  governanceContract: GetContractReturnType<typeof IGovernanceCore_ABI, PublicClient, WalletClient>;
  cacheLogs: () => Promise<{
    createdLogs: Array<CreatedLog>;
    queuedLogs: Array<QueuedLog>;
    executedLogs: Array<ExecutedLog>;
    payloadSentLogs: Array<PayloadSentLog>;
    votingActivatedLogs: Array<VotingActivatedLog>;
    canceledLogs: Array<CanceledLog>;
  }>;
  /**
   * Thin caching wrapper on top of getProposal.
   * If the proposal state is final, the proposal will be stored in json and fetched from there.
   * @param proposalId
   * @returns Proposal struct
   */
  getProposal: (proposalId: bigint) => Promise<ContractFunctionResult<typeof IGovernanceCore_ABI, 'getProposal'>>;
  getProposalAndLogs: (
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
  getStorageRoots(proposalId: bigint): Promise<Proof[]>;
  /**
   * Returns the proofs that are non-zero for a specified address
   * @param proposalId
   * @param voter
   * @param votingChainId
   */
  getVotingProofs: (
    proposalId: bigint,
    voter: Hex,
    votingChainId: bigint
  ) => Promise<{ proof: Hex; slot: bigint; underlyingAsset: Hex }[]>;
}

const SLOTS = {
  PROPOSALS_MAPPING: 7n,
};

export const HUMAN_READABLE_STATE = {
  [ProposalState.Null]: 'Null',
  [ProposalState.Created]: 'Created',
  [ProposalState.Active]: 'Active',
  [ProposalState.Queued]: 'Queued',
  [ProposalState.Executed]: 'Executed',
  [ProposalState.Failed]: 'Failed',
  [ProposalState.Cancelled]: 'Cancelled',
  [ProposalState.Expired]: 'Expired',
};

interface GetGovernanceParams {
  address: Hex;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  blockCreated?: bigint;
}

export const getGovernance = ({
  address,
  publicClient,
  walletClient,
}: GetGovernanceParams): Governance<typeof walletClient> => {
  const governanceContract = getContract({ abi: IGovernanceCore_ABI, address, publicClient, walletClient });

  async function getProposal(proposalId: bigint) {
    const filePath = publicClient.chain!.id.toString() + `/proposals`;
    const fileName = proposalId;
    const cache = readJSONCache(filePath, fileName.toString());
    if (cache) return cache;
    const proposal = await governanceContract.read.getProposal([proposalId]);
    if (isStateFinal(proposal.state)) writeJSONCache(filePath, fileName.toString(), proposal);
    return proposal;
  }

  async function getSimulationPayloadForExecution(proposalId: bigint) {
    const currentBlock = await publicClient.getBlock();
    const proposalSlot = getSolidityStorageSlotUint(SLOTS.PROPOSALS_MAPPING, proposalId);
    const data = await publicClient.getStorageAt({
      address: governanceContract.address,
      slot: proposalSlot,
    });
    let proposalSlot1 = fromHex(data!, { to: 'bigint' });
    // manipulate storage
    // set queued
    proposalSlot1 = setBits(proposalSlot1, 0n, 8n, ProposalState.Queued);
    // set creation time
    proposalSlot1 = setBits(
      proposalSlot1,
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
      // value: parseEther('0.5').toString(),
      block_number: Number(currentBlock.number),
      state_objects: {
        [governanceContract.address]: {
          storage: {
            [proposalSlot]: toHex(proposalSlot1, { size: 32 }), // state & time
            // [toHex(fromHex(proposalSlot, { to: 'bigint' }) + 5n)]: toHex(parseUnits('340000000', 18), {
            //   size: 32,
            // }), // votes (not needed as there's no validation for this at this point)
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
        address
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
        address
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
        address
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
        address
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
        address
      );
      const canceledLogs = await getLogs(
        publicClient,
        (fromBlock, toBlock) => {
          return governanceContract.createEventFilter.ProposalCanceled(
            {},
            {
              fromBlock: fromBlock,
              toBlock,
            }
          );
        },
        address
      );
      return { createdLogs, queuedLogs, executedLogs, payloadSentLogs, votingActivatedLogs, canceledLogs };
    },
    getProposal,
    async getProposalAndLogs(proposalId, logs) {
      const proposal = await getProposal(proposalId);
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
    async getVotingProofs(proposalId: bigint, voter: Hex, votingChainId: bigint) {
      const proposal = await getProposal(proposalId);

      // TODO: replace with real addresses
      const [stkAaveProof, aaveProof, aAaveProof, representativeProof] = await Promise.all([
        getProof(
          publicClient,
          AaveSafetyModule.STK_AAVE,
          [getSolidityStorageSlotAddress(VOTING_SLOTS[AaveSafetyModule.STK_AAVE].balance, voter)],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          '0xb6D88BfC5b145a558b279cf7692e6F02064889d0',
          [getSolidityStorageSlotAddress(VOTING_SLOTS['0xb6D88BfC5b145a558b279cf7692e6F02064889d0'].balance, voter)],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          '0xD1ff82609FB63A0eee6FE7D2896d80d29491cCCd',
          [
            getSolidityStorageSlotAddress(VOTING_SLOTS['0xD1ff82609FB63A0eee6FE7D2896d80d29491cCCd'].balance, voter),
            getSolidityStorageSlotAddress(VOTING_SLOTS['0xD1ff82609FB63A0eee6FE7D2896d80d29491cCCd'].delegation, voter),
          ],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          '0x586207Df62c7D5D1c9dBb8F61EdF77cc30925C4F',
          [
            getSolidityStorageSlotBytes(
              getSolidityStorageSlotAddress(
                VOTING_SLOTS['0x586207Df62c7D5D1c9dBb8F61EdF77cc30925C4F'].representative,
                voter
              ),
              toHex(votingChainId, { size: 32 })
            ),
          ],
          proposal.snapshotBlockHash
        ),
      ]);

      return [
        { proof: stkAaveProof, slots: [0n] },
        { proof: aaveProof, slots: [0n] },
        { proof: aAaveProof, slots: [52n, 64n] },
        { proof: representativeProof, slots: [9n] },
      ]
        .map(({ proof, slots }) => {
          return (
            slots
              // filter out zero proofs as they don't add any value
              .filter((slot, ix) => {
                const shouldSubmitProof = proof.storageProof[ix].value !== '0x0';
                if (!shouldSubmitProof)
                  logInfo('Proof', `Skipping slot ${slot} on ${proof.address} as value is zero for voter ${voter}`);
                return shouldSubmitProof;
              })
              .map((slot, ix) => ({
                underlyingAsset: proof.address,
                slot,
                proof: getAccountRPL(proof.storageProof[ix].proof),
              }))
          );
        })
        .flat();
    },
    async getStorageRoots(proposalId: bigint) {
      const proposal = await getProposal(proposalId);
      const addresses = merge(VOTING_SLOTS, WAREHOUSE_SLOTS);

      const proofs = await Promise.all(
        (Object.keys(addresses) as (keyof typeof addresses)[]).map((address) =>
          getProof(
            publicClient,
            address,
            Object.keys(addresses[address]).map((slotKey) => toHex((addresses[address] as any)[slotKey])),
            proposal.snapshotBlockHash
          )
        )
      );

      return proofs;
    },
  };
};