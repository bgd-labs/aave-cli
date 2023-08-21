import { simulateProposal } from '../simulate/govv3/simulate';

export const command = 'simulate-proposal-v3 [proposalId]';

export const describe = 'simulates a aave v3 governance proposal';

export const handler = async function (argv) {
  if (!argv.proposalId) throw new Error('proposalId is required');
  const proposalId = BigInt(argv.proposalId);
  const result = await simulateProposal(proposalId);
  // console.log(result);
};
