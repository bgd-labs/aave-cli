import { Command } from '@commander-js/extra-typings';
import { simulateProposal } from '../simulate/govv3/simulate';
import { GovernanceV3Sepolia } from '@bgd-labs/aave-address-book';
import { getGovernance } from '../simulate/govv3/governance';
import { createPublicClient } from 'viem';
import { sepoliaClient } from '../utils/rpcClients';
import { logInfo } from '../utils/logger';

export const command = 'governance-v3 [proposalId]';

export const describe = 'interact with governance v3';

export const builder = (yargs) =>
  yargs
    .option('chainId', {
      type: 'number',
      describe: 'the chainId to fork',
    })
    .option('blockNumber', {
      type: 'number',
      describe: 'the blocknumber to fork (latest if omitted)',
    })
    .option('alias', {
      type: 'string',
      describe: 'custom alias',
    })
    .option('proposalId', {
      type: 'number',
      describe: 'Proposal or actionSetId',
    })
    .option('payloadAddress', {
      type: 'string',
      describe: 'address of the payload to execute',
    })
    .option('executor', {
      type: 'string',
      describe: '(optional) address of the executor',
    });

export const handler = async function (argv) {
  if (argv.proposalId == undefined) throw new Error('proposalId is required');
  const proposalId = BigInt(argv.proposalId);
  const result = await simulateProposal(GovernanceV3Sepolia.GOVERNANCE, proposalId);
  // console.log(result);
};

export function addCommand(program: Command) {
  const govV3 = program.command('governanceV3').description('interact with governance v3 contracts');

  govV3
    .command('simulate')
    .description('simulates a proposal on tenderly')
    .requiredOption('--proposalId <number>', 'proposalId to simulate via tenderly')
    .action(async (name, options) => {
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      await simulateProposal(GovernanceV3Sepolia.GOVERNANCE, proposalId);
    });

  govV3
    .command('view')
    .description('shows all the proposals & state')
    .action(async () => {
      const governance = getGovernance(GovernanceV3Sepolia.GOVERNANCE, sepoliaClient, 3962575n);
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
    .command('generateProof')
    .description('generates the proof etc')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .action((name, options) => {
      console.log('simulate', options);
    });
}
