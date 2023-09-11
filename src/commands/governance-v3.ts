import { Command } from '@commander-js/extra-typings';
import { simulateProposal } from '../simulate/govv3/simulate';
import { GovernanceV3Goerli } from '@bgd-labs/aave-address-book';
import { HUMAN_READABLE_STATE, State, getGovernance } from '../simulate/govv3/governance';
import { goerliClient } from '../utils/rpcClients';
import { logError, logInfo } from '../utils/logger';
import { Hex, createWalletClient, encodeAbiParameters, getContract, http } from 'viem';

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
        const { createdLog, executedLog, payloadSentLog, votingActivatedLog, queuedLog, proposal } =
          await governance.getProposal(BigInt(proposalId), logs);
        logInfo(
          `Proposal ${proposalId}`,
          `### Proposal ${proposalId} Summary ###\n` +
            `State: ${HUMAN_READABLE_STATE[proposal.state as keyof typeof HUMAN_READABLE_STATE]}\n` +
            `For Votes: ${proposal.forVotes}\n` +
            `Against Votes: ${proposal.againstVotes}\n` +
            `Creator: ${proposal.creator}\n` +
            `Payloads: ${JSON.stringify(
              proposal.payloads,
              (key, value) => (typeof value === 'bigint' ? value.toString() : value),
              2
            )}`
        );
        logInfo(
          `Proposal ${proposalId} log`,
          `${new Date(createdLog.timestamp * 1000).toLocaleString()} Proposal created`
        );
        if (votingActivatedLog) {
          logInfo(
            `Proposal ${proposalId} log`,
            `${new Date(votingActivatedLog.timestamp * 1000).toLocaleString()} Voting activated`
          );
        }
        if (queuedLog) {
          logInfo(
            `Proposal ${proposalId} log`,
            `${new Date(queuedLog.timestamp * 1000).toLocaleString()} Proposal queued`
          );
        }
        if (executedLog) {
          logInfo(
            `Proposal ${proposalId} log`,
            `${new Date(executedLog.timestamp * 1000).toLocaleString()} Proposal executed`
          );
        }
        if (payloadSentLog) {
          payloadSentLog.map((log) => {
            logInfo(
              `Proposal ${proposalId} log`,
              `${new Date(log.timestamp * 1000).toLocaleString()} Payload ${log.args.payloadId}:${
                log.args.payloadsController
              } sent to chainId:${log.args.chainId}`
            );
          });
        }
        console.log(`\n`);
      }
    });

  /**
   *
   */
  govV3
    .command('getWarehouseRoots')
    .description('generate the roots for the warehouse')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));

      const proofs = await governance.getRoots(proposalId);
    });

  /**
   *
   */
  govV3
    .command('getVotingProofs')
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

      const proofs = await governance.getVotingProofs(proposalId, voter);
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
      // perhaps makes sense to show encoded data to vote?
      logError('TODO', 'not yet implemented');
    });
}
