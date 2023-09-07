import { Command } from '@commander-js/extra-typings';
import { simulateProposal } from '../simulate/govv3/simulate';
import { GovernanceV3Goerli } from '@bgd-labs/aave-address-book';
import { State, getGovernance } from '../simulate/govv3/governance';
import { goerliClient } from '../utils/rpcClients';
import { logError, logInfo } from '../utils/logger';
import { Hex, createWalletClient, http } from 'viem';
import { VOTING_SLOTS, getProof } from '../simulate/govv3/proofs';
import { getSolidityStorageSlotAddress } from '../utils/storageSlots';

const DEFAULT_GOVERNANCE = GovernanceV3Goerli.GOVERNANCE;
const DEFAULT_CLIENT = goerliClient;

export function addCommand(program: Command) {
  const govV3 = program.command('governanceV3').description('interact with governance v3 contracts');

  govV3
    .command('simulate')
    .description('simulates a proposal on tenderly')
    .requiredOption('--proposalId <number>', 'proposalId to simulate via tenderly')
    .action(async (name, options) => {
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      await simulateProposal(DEFAULT_GOVERNANCE, proposalId);
    });

  govV3
    .command('view')
    .description('shows all the proposals & state')
    .action(async () => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
        blockCreated: 9640498n,
      });
      const logs = await governance.cacheLogs();
      const count = await governance.governanceContract.read.getProposalsCount();
      const proposalIds = [...Array(Number(count)).keys()];
      for (const proposalId of proposalIds) {
        const { createdLog, executedLog, payloadSentLog, queuedLog, proposal } = await governance.getProposal(
          BigInt(proposalId),
          logs
        );
        logInfo(
          `Proposal ${proposalId}`,
          `Proposal created on ${new Date(createdLog.timestamp * 1000).toLocaleString()}`
        );
        if (queuedLog) {
          logInfo(
            `Proposal ${proposalId}`,
            `Proposal was queued with final votes of ${queuedLog.args.votesFor} to ${
              queuedLog.args.votesAgainst
            } on ${new Date(queuedLog.timestamp * 1000).toLocaleString()}`
          );
        }
        if (executedLog) {
          logInfo(
            `Proposal ${proposalId}`,
            `Proposal was executed on ${new Date(executedLog.timestamp * 1000).toLocaleString()}`
          );
        }
      }
    });

  govV3
    .command('votingProofs')
    .description('generates the proofs for voting')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .requiredOption('--voter <string>', 'the address to vote')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      const voter = options.getOptionValue('voter') as Hex;

      const proposal = await governance.governanceContract.read.getProposal([proposalId]);

      for (const key of Object.keys(VOTING_SLOTS) as (keyof typeof VOTING_SLOTS)[]) {
        console.log(key);
        const proof = await getProof(
          DEFAULT_CLIENT,
          key,
          VOTING_SLOTS[key].map((slot) => getSolidityStorageSlotAddress(slot, voter)),
          proposal.snapshotBlockHash
        );
      }
    });

  govV3
    .command('vote')
    .description('vote for or against any given proposal')
    .requiredOption('--proposalId <number>', 'proposalId to vote for')
    .option('--for', 'Vote in favour of the proposal')
    .option('--against', 'vote against the proposal')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
        walletClient: createWalletClient({ account: '0x0', chain: DEFAULT_CLIENT.chain, transport: http() }),
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      const proposal = await governance.governanceContract.read.getProposal([proposalId]);
      if (proposal.state !== State.Active) {
        throw new Error('can only vote on active proposals');
      }
      const voteFor = options.getOptionValue('for');
      const voteAgainst = options.getOptionValue('against');
      if (voteFor && voteAgainst) {
        throw new Error('you must either vote --for, or --against');
      }
      logError('TODO', 'not yet implemented');
    });
}
