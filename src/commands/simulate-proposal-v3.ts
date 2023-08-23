import { simulateProposal } from '../simulate/govv3/simulate';
import { AaveV3Sepolia } from '@bgd-labs/aave-address-book';

export const command = 'simulate-proposal-v3 [proposalId]';

export const describe = 'simulates a aave v3 governance proposal';

export const handler = async function (argv) {
  if (argv.proposalId == undefined) throw new Error('proposalId is required');
  const proposalId = BigInt(argv.proposalId);
  const result = await simulateProposal(AaveV3Sepolia.GOVERNANCE, proposalId);
  // console.log(result);
};
