import {
  AbiStateMutability,
  ContractFunctionReturnType,
  GetContractReturnType,
  Hex,
  PublicClient,
  encodeFunctionData,
  fromHex,
  getAbiItem,
  getContract,
  toHex,
} from 'viem';
import merge from 'deepmerge';
import { LogWithTimestamp, getAndCacheLogs } from '../utils/logs';
import {
  AaveSafetyModule,
  AaveV3Ethereum,
  GovernanceV3Ethereum,
  IGovernanceCore_ABI,
} from '@bgd-labs/aave-address-book';
import { TenderlyRequest, TenderlySimulationResponse, tenderly } from '../utils/tenderlyClient';
import { EOA } from '../utils/constants';
import {
  getSolidityStorageSlotAddress,
  getSolidityStorageSlotBytes,
  getSolidityStorageSlotUint,
} from '../utils/storageSlots';
import { setBits } from '../utils/storageSlots';
import { VOTING_SLOTS, WAREHOUSE_SLOTS, getAccountRPL, getProof } from './proofs';
import { logInfo } from '../utils/logger';
import { GetProofReturnType } from 'viem/_types/actions/public/getProof';
import { readJSONCache, writeJSONCache } from '@bgd-labs/js-utils';
import {
  ProposalCreatedEvent,
  ProposalExecutedEvent,
  ProposalPayloadSentEvent,
  ProposalQueuedEvent,
  ProposalVotingActivatedEvent,
  findProposalLogs,
  getGovernanceEvents,
} from './cache/modules/governance';

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

export interface Governance {
  governanceContract: GetContractReturnType<typeof IGovernanceCore_ABI, PublicClient>;
  /**
   * Thin caching wrapper on top of getProposal.
   * If the proposal state is final, the proposal will be stored in json and fetched from there.
   * @param proposalId
   * @returns Proposal struct
   */
  getProposal: (
    proposalId: bigint
  ) => Promise<ContractFunctionReturnType<typeof IGovernanceCore_ABI, AbiStateMutability, 'getProposal'>>;
  getProposalAndLogs: (
    proposalId: bigint,
    logs: Awaited<ReturnType<typeof getGovernanceEvents>>
  ) => Promise<{
    proposal: ContractFunctionReturnType<typeof IGovernanceCore_ABI, AbiStateMutability, 'getProposal'>;
    createdLog: ProposalCreatedEvent;
    queuedLog?: ProposalQueuedEvent;
    executedLog?: ProposalExecutedEvent;
    votingActivatedLog?: ProposalVotingActivatedEvent;
    payloadSentLog: ProposalPayloadSentEvent[];
  }>;
  getSimulationPayloadForExecution: (proposalId: bigint) => Promise<TenderlyRequest>;
  simulateProposalExecutionOnTenderly: (
    proposalId: bigint,
    params: { executedLog?: ProposalExecutedEvent }
  ) => Promise<TenderlySimulationResponse>;
  getStorageRoots(proposalId: bigint): Promise<GetProofReturnType[]>;
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
  blockCreated?: bigint;
}

export const getGovernance = ({ address, publicClient }: GetGovernanceParams): Governance => {
  const governanceContract = getContract({
    abi: IGovernanceCore_ABI,
    address,
    client: publicClient,
  });

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
    getProposal,
    async getProposalAndLogs(proposalId, logs) {
      const proposal = await getProposal(proposalId);
      const proposalLogs = await findProposalLogs(logs, proposalId);
      return { proposal, ...proposalLogs };
    },
    getSimulationPayloadForExecution,
    async simulateProposalExecutionOnTenderly(proposalId, { executedLog }) {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await publicClient.getTransaction({ hash: executedLog.transactionHash! });
        return tenderly.simulateTx(publicClient.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(proposalId);
      return tenderly.simulate(payload, publicClient);
    },
    async getVotingProofs(proposalId: bigint, voter: Hex, votingChainId: bigint) {
      const proposal = await getProposal(proposalId);

      const [stkAaveProof, aaveProof, aAaveProof, representativeProof] = await Promise.all([
        getProof(
          publicClient,
          AaveSafetyModule.STK_AAVE,
          [getSolidityStorageSlotAddress(VOTING_SLOTS[AaveSafetyModule.STK_AAVE].balance, voter)],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          AaveV3Ethereum.ASSETS.AAVE.UNDERLYING,
          [getSolidityStorageSlotAddress(VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.UNDERLYING].balance, voter)],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          AaveV3Ethereum.ASSETS.AAVE.A_TOKEN,
          [
            getSolidityStorageSlotAddress(VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.A_TOKEN].balance, voter),
            getSolidityStorageSlotAddress(VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.A_TOKEN].delegation, voter),
          ],
          proposal.snapshotBlockHash
        ),
        getProof(
          publicClient,
          GovernanceV3Ethereum.GOVERNANCE,
          [
            getSolidityStorageSlotBytes(
              getSolidityStorageSlotAddress(VOTING_SLOTS[GovernanceV3Ethereum.GOVERNANCE].representative, voter),
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
                const shouldSubmitProof = proof.storageProof[ix].value !== 0n;
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
