import { AaveV3Sepolia } from '@bgd-labs/aave-address-book';
import { logError, logInfo, logSuccess } from '../../utils/logger';
import { TenderlySimulationResponse } from '../../utils/tenderlyClient';
import { getGovernance } from './governance';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

export async function simulateProposal(proposalId: bigint) {
  logInfo('General', `Running simulation for ${proposalId}`);
  const governance = getGovernance(
    AaveV3Sepolia.GOVERNANCE,
    createPublicClient({ chain: sepolia, transport: http(process.env.RPC_SEPOLIA) }),
    3962575n
  );
  const logs = await governance.cacheLogs();
  const proposal = await governance.getProposal(proposalId, logs);
  console.log(proposal);
  return {};
}
