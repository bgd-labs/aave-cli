import { simulateProposal } from '../simulate/simulate';

export const command = 'simulate-proposal [proposalId]';

export const describe = 'simulates a aave v2 governance proposal';

export const builder = (yargs) =>
  yargs.option('chainId', {
    type: 'string',
    describe: 'TODO: implement',
  });

export const handler = async function (argv) {
  if (!argv.proposalId) throw new Error('proposalId is required');
  const proposalId = BigInt(argv.proposalId);
  const result = await simulateProposal(proposalId);
  // console.log(result);
};
