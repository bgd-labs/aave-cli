import { Address, Hex, fromHex, pad, toHex } from 'viem';
import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { getSolidityStorageSlotUint } from '../../utils/storageSlots';

export const AAVE_GOVERNANCE_V2_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'governanceStrategy', type: 'address' },
      { internalType: 'uint256', name: 'votingDelay', type: 'uint256' },
      { internalType: 'address', name: 'guardian', type: 'address' },
      { internalType: 'address[]', name: 'executors', type: 'address[]' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
    ],
    name: 'ExecutorAuthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'executor',
        type: 'address',
      },
    ],
    name: 'ExecutorUnauthorized',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'newStrategy',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiatorChange',
        type: 'address',
      },
    ],
    name: 'GovernanceStrategyChanged',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'ProposalCanceled',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: true,
        internalType: 'address',
        name: 'creator',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'contract IExecutorWithTimelock',
        name: 'executor',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address[]',
        name: 'targets',
        type: 'address[]',
      },
      {
        indexed: false,
        internalType: 'uint256[]',
        name: 'values',
        type: 'uint256[]',
      },
      {
        indexed: false,
        internalType: 'string[]',
        name: 'signatures',
        type: 'string[]',
      },
      {
        indexed: false,
        internalType: 'bytes[]',
        name: 'calldatas',
        type: 'bytes[]',
      },
      {
        indexed: false,
        internalType: 'bool[]',
        name: 'withDelegatecalls',
        type: 'bool[]',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'startBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'endBlock',
        type: 'uint256',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'strategy',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'ipfsHash',
        type: 'bytes32',
      },
    ],
    name: 'ProposalCreated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiatorExecution',
        type: 'address',
      },
    ],
    name: 'ProposalExecuted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'executionTime',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiatorQueueing',
        type: 'address',
      },
    ],
    name: 'ProposalQueued',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'id', type: 'uint256' },
      {
        indexed: true,
        internalType: 'address',
        name: 'voter',
        type: 'address',
      },
      { indexed: false, internalType: 'bool', name: 'support', type: 'bool' },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'votingPower',
        type: 'uint256',
      },
    ],
    name: 'VoteEmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'uint256',
        name: 'newVotingDelay',
        type: 'uint256',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'initiatorChange',
        type: 'address',
      },
    ],
    name: 'VotingDelayChanged',
    type: 'event',
  },
  {
    inputs: [],
    name: 'DOMAIN_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'NAME',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VOTE_EMITTED_TYPEHASH',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: '__abdicate',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address[]', name: 'executors', type: 'address[]' }],
    name: 'authorizeExecutors',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'cancel',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'contract IExecutorWithTimelock',
        name: 'executor',
        type: 'address',
      },
      { internalType: 'address[]', name: 'targets', type: 'address[]' },
      { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
      { internalType: 'string[]', name: 'signatures', type: 'string[]' },
      { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
      { internalType: 'bool[]', name: 'withDelegatecalls', type: 'bool[]' },
      { internalType: 'bytes32', name: 'ipfsHash', type: 'bytes32' },
    ],
    name: 'create',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'execute',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGovernanceStrategy',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getGuardian',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'getProposalById',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'id', type: 'uint256' },
          { internalType: 'address', name: 'creator', type: 'address' },
          {
            internalType: 'contract IExecutorWithTimelock',
            name: 'executor',
            type: 'address',
          },
          { internalType: 'address[]', name: 'targets', type: 'address[]' },
          { internalType: 'uint256[]', name: 'values', type: 'uint256[]' },
          { internalType: 'string[]', name: 'signatures', type: 'string[]' },
          { internalType: 'bytes[]', name: 'calldatas', type: 'bytes[]' },
          { internalType: 'bool[]', name: 'withDelegatecalls', type: 'bool[]' },
          { internalType: 'uint256', name: 'startBlock', type: 'uint256' },
          { internalType: 'uint256', name: 'endBlock', type: 'uint256' },
          { internalType: 'uint256', name: 'executionTime', type: 'uint256' },
          { internalType: 'uint256', name: 'forVotes', type: 'uint256' },
          { internalType: 'uint256', name: 'againstVotes', type: 'uint256' },
          { internalType: 'bool', name: 'executed', type: 'bool' },
          { internalType: 'bool', name: 'canceled', type: 'bool' },
          { internalType: 'address', name: 'strategy', type: 'address' },
          { internalType: 'bytes32', name: 'ipfsHash', type: 'bytes32' },
        ],
        internalType: 'struct IAaveGovernanceV2.ProposalWithoutVotes',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'getProposalState',
    outputs: [
      {
        internalType: 'enum IAaveGovernanceV2.ProposalState',
        name: '',
        type: 'uint8',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getProposalsCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'address', name: 'voter', type: 'address' },
    ],
    name: 'getVoteOnProposal',
    outputs: [
      {
        components: [
          { internalType: 'bool', name: 'support', type: 'bool' },
          { internalType: 'uint248', name: 'votingPower', type: 'uint248' },
        ],
        internalType: 'struct IAaveGovernanceV2.Vote',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVotingDelay',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'executor', type: 'address' }],
    name: 'isExecutorAuthorized',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'proposalId', type: 'uint256' }],
    name: 'queue',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'governanceStrategy', type: 'address' }],
    name: 'setGovernanceStrategy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'votingDelay', type: 'uint256' }],
    name: 'setVotingDelay',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'bool', name: 'support', type: 'bool' },
    ],
    name: 'submitVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'proposalId', type: 'uint256' },
      { internalType: 'bool', name: 'support', type: 'bool' },
      { internalType: 'uint8', name: 'v', type: 'uint8' },
      { internalType: 'bytes32', name: 'r', type: 'bytes32' },
      { internalType: 'bytes32', name: 's', type: 'bytes32' },
    ],
    name: 'submitVoteBySignature',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address[]', name: 'executors', type: 'address[]' }],
    name: 'unauthorizeExecutors',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

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
