import {
  AaveSafetyModule,
  AaveV3Ethereum,
  GovernanceV3Ethereum,
  IGovernanceCore_ABI,
} from '@bgd-labs/aave-address-book';
import merge from 'deepmerge';
import {
  type Client,
  type GetContractReturnType,
  type Hex,
  encodeFunctionData,
  fromHex,
  getContract,
  toHex,
} from 'viem';
import type {GetProofReturnType} from 'viem/actions';
import {getBlock, getStorageAt, getTransaction} from 'viem/actions';
import {EOA} from '../utils/constants';
import {logInfo} from '../utils/logger';
import {
  getSolidityStorageSlotAddress,
  getSolidityStorageSlotBytes,
  getSolidityStorageSlotUint,
} from '../utils/storageSlots';
import {setBits} from '../utils/storageSlots';
import {
  type TenderlyRequest,
  type TenderlySimulationResponse,
  tenderly,
} from '../utils/tenderlyClient';
import {VOTING_SLOTS, WAREHOUSE_SLOTS, getAccountRPL, getProof} from './proofs';
import type {Proposal, ProposalExecutedEvent} from '@bgd-labs/aave-v3-governance-cache';

export enum ProposalState {
  Null = 0, // proposal does not exists
  Created = 1, // created, waiting for a cooldown to initiate the balances snapshot
  Active = 2, // balances snapshot set, voting in progress
  Queued = 3, // voting results submitted, but proposal is under grace period when guardian can cancel it
  Executed = 4, // results sent to the execution chain(s)
  Failed = 5, // voting was not successful
  Cancelled = 6, // got cancelled by guardian, or because proposition power of creator dropped below allowed minimum
  Expired = 7,
}

export function isProposalFinal(state: ProposalState) {
  return [
    ProposalState.Executed,
    ProposalState.Failed,
    ProposalState.Cancelled,
    ProposalState.Expired,
  ].includes(state);
}

export interface Governance {
  governanceContract: GetContractReturnType<typeof IGovernanceCore_ABI, Client>;
  /**
   * Thin caching wrapper on top of getProposal.
   * If the proposal state is final, the proposal will be stored in json and fetched from there.
   * @param proposalId
   * @returns Proposal struct
   */
  getSimulationPayloadForExecution: (proposalId: bigint) => Promise<TenderlyRequest>;
  simulateProposalExecutionOnTenderly: (
    proposalId: bigint,
    params: {executedLog?: ProposalExecutedEvent},
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
    votingChainId: bigint,
  ) => Promise<{proof: Hex; slot: bigint; underlyingAsset: Hex}[]>;
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
  client: Client;
  blockCreated?: bigint;
}

export const getGovernance = ({address, client}: GetGovernanceParams): Governance => {
  const governanceContract = getContract({
    abi: IGovernanceCore_ABI,
    address,
    client,
  });

  async function getProposal(proposalId: bigint) {
    return governanceContract.read.getProposal([proposalId]);
  }

  async function getSimulationPayloadForExecution(proposalId: bigint) {
    const currentBlock = await getBlock(client);
    const proposalSlot = getSolidityStorageSlotUint(SLOTS.PROPOSALS_MAPPING, proposalId);
    const data = await getStorageAt(client, {
      address: governanceContract.address,
      slot: proposalSlot,
    });
    let proposalSlot1 = fromHex(data!, {to: 'bigint'});
    // manipulate storage
    // set queued
    proposalSlot1 = setBits(proposalSlot1, 0n, 8n, ProposalState.Queued);
    // set creation time
    proposalSlot1 = setBits(
      proposalSlot1,
      16n,
      56n,
      currentBlock.timestamp - (await governanceContract.read.PROPOSAL_EXPIRATION_TIME()),
    );
    const simulationPayload: TenderlyRequest = {
      network_id: String(client.chain!.id),
      from: EOA,
      to: governanceContract.address,
      input: encodeFunctionData({
        abi: IGovernanceCore_ABI,
        functionName: 'executeProposal',
        args: [proposalId],
      }),
      // value: parseEther('0.5').toString(),
      block_number: -2,
      state_objects: {
        [governanceContract.address]: {
          storage: {
            [proposalSlot]: toHex(proposalSlot1, {size: 32}), // state & time
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
    getSimulationPayloadForExecution,
    async simulateProposalExecutionOnTenderly(proposalId, {executedLog}) {
      // if successfully executed just replay the txn
      if (executedLog) {
        const tx = await getTransaction(client, {
          hash: executedLog.transactionHash!,
        });
        return tenderly.simulateTx(client.chain!.id, tx);
      }
      const payload = await getSimulationPayloadForExecution(proposalId);
      return tenderly.simulate(payload, client);
    },
    async getVotingProofs(proposalId: bigint, voter: Hex, votingChainId: bigint) {
      const proposal = await getProposal(proposalId);

      const [stkAaveProof, aaveProof, aAaveProof, representativeProof] = await Promise.all([
        getProof(
          client,
          AaveSafetyModule.STK_AAVE,
          [getSolidityStorageSlotAddress(VOTING_SLOTS[AaveSafetyModule.STK_AAVE].balance, voter)],
          proposal.snapshotBlockHash,
        ),
        getProof(
          client,
          AaveV3Ethereum.ASSETS.AAVE.UNDERLYING,
          [
            getSolidityStorageSlotAddress(
              VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.UNDERLYING].balance,
              voter,
            ),
          ],
          proposal.snapshotBlockHash,
        ),
        getProof(
          client,
          AaveV3Ethereum.ASSETS.AAVE.A_TOKEN,
          [
            getSolidityStorageSlotAddress(
              VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.A_TOKEN].balance,
              voter,
            ),
            getSolidityStorageSlotAddress(
              VOTING_SLOTS[AaveV3Ethereum.ASSETS.AAVE.A_TOKEN].delegation,
              voter,
            ),
          ],
          proposal.snapshotBlockHash,
        ),
        getProof(
          client,
          GovernanceV3Ethereum.GOVERNANCE,
          [
            getSolidityStorageSlotBytes(
              getSolidityStorageSlotAddress(
                VOTING_SLOTS[GovernanceV3Ethereum.GOVERNANCE].representative,
                voter,
              ),
              toHex(votingChainId, {size: 32}),
            ),
          ],
          proposal.snapshotBlockHash,
        ),
      ]);

      return [
        {proof: stkAaveProof, slots: [0n]},
        {proof: aaveProof, slots: [0n]},
        {proof: aAaveProof, slots: [52n, 64n]},
        {proof: representativeProof, slots: [9n]},
      ].flatMap(({proof, slots}) => {
        return (
          slots
            // filter out zero proofs as they don't add any value
            .filter((slot, ix) => {
              const shouldSubmitProof = proof.storageProof[ix].value !== 0n;
              if (!shouldSubmitProof)
                logInfo(
                  'Proof',
                  `Skipping slot ${slot} on ${proof.address} as value is zero for voter ${voter}`,
                );
              return shouldSubmitProof;
            })
            .map((slot, ix) => ({
              underlyingAsset: proof.address,
              slot,
              proof: getAccountRPL(proof.storageProof[ix].proof),
            }))
        );
      });
    },
    async getStorageRoots(proposalId: bigint) {
      const proposal = await getProposal(proposalId);
      const addresses = merge(VOTING_SLOTS, WAREHOUSE_SLOTS);

      const proofs = await Promise.all(
        (Object.keys(addresses) as (keyof typeof addresses)[]).map((address) =>
          getProof(
            client,
            address,
            Object.keys(addresses[address]).map((slotKey) =>
              toHex((addresses[address] as any)[slotKey]),
            ),
            proposal.snapshotBlockHash,
          ),
        ),
      );

      return proofs;
    },
  };
};
