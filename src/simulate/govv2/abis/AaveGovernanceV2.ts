import { Address, Hex, fromHex, pad, toHex } from 'viem';
import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { getSolidityStorageSlotUint } from '../../../utils/storageSlots';

export enum PROPOSAL_STATES {
  PENDING,
  CANCELED,
  ACTIVE,
  FAILED,
  SUCCEEDED,
  QUEUED,
  EXPIRED,
  EXECUTED,
}

export const AAVE_GOVERNANCE_V2_START_BLOCK = 11427398n;
/**
 * @notice Returns an object containing various AaveGovernanceV2 slots
 * @param id Proposal ID
 */
export function getAaveGovernanceV2Slots(proposalId: bigint, executor: Address) {
  // TODO generalize this for other storage layouts

  // struct Proposal {
  //   uint256 id;
  //   address creator;
  //   IExecutorWithTimelock executor;
  //   address[] targets;
  //   uint256[] values;
  //   string[] signatures;
  //   bytes[] calldatas;
  //   bool[] withDelegatecalls;
  //   uint256 startBlock;
  //   uint256 endBlock;
  //   uint256 executionTime;
  //   uint256 forVotes;
  //   uint256 againstVotes;
  //   bool executed;
  //   bool canceled;
  //   address strategy;
  //   bytes32 ipfsHash;
  //   mapping(address => Vote) votes;
  // }

  const etaOffset = 10n;
  const forVotesOffset = 11n;
  const againstVotesOffset = 12n;
  const canceledSlotOffset = 13n; // this is packed with `executed`

  // Compute and return slot numbers
  const votingStrategySlot: Hex = '0x1';
  let queuedTxsSlot: Hex;
  if (executor === AaveGovernanceV2.SHORT_EXECUTOR) {
    queuedTxsSlot = '0x3';
  }
  if (executor === AaveGovernanceV2.LONG_EXECUTOR) {
    queuedTxsSlot = '0x07';
  }
  if (!queuedTxsSlot!) throw new Error('unknown executor');
  const proposalsMapSlot = 4n; // proposals ID to proposal struct mapping
  const proposalSlot = fromHex(getSolidityStorageSlotUint(proposalsMapSlot, proposalId), 'bigint');
  return {
    queuedTxsSlot,
    votingStrategySlot,
    proposalsMapSlot: proposalsMapSlot,
    proposalSlot: proposalSlot,
    canceled: pad(toHex(proposalSlot + canceledSlotOffset), { size: 32 }),
    eta: pad(toHex(proposalSlot + etaOffset), { size: 32 }),
    forVotes: pad(toHex(proposalSlot + forVotesOffset), { size: 32 }),
    againstVotes: pad(toHex(proposalSlot + againstVotesOffset), { size: 32 }),
  };
}
