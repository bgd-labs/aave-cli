import { logInfo } from '../utils/logger';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { getGovernance } from './governance';
import { Hex, PublicClient } from 'viem';
import { PayloadsController, getPayloadsController } from './payloadsController';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';

/**
 * Reference implementation, unused
 * @param governanceAddress
 * @param publicClient
 * @param proposalId
 * @returns
 */
export async function simulateProposal(governanceAddress: Hex, publicClient: PublicClient, proposalId: bigint) {
  logInfo('General', `Running simulation for ${proposalId}`);
  const governance = getGovernance({ address: governanceAddress, publicClient });
  const logs = await governance.cacheLogs();
  const proposal = await governance.getProposalAndLogs(proposalId, logs);
  await governance.simulateProposalExecutionOnTenderly(proposalId, proposal);
  const payloads: {
    payload: Awaited<ReturnType<PayloadsController['getPayload']>>;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const payload of proposal.proposal.payloads) {
    const controllerContract = getPayloadsController(
      payload.payloadsController,
      CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP] as PublicClient
    );
    const logs = await controllerContract.cacheLogs();
    const config = await controllerContract.getPayload(payload.payloadId, logs);
    try {
      const result = await controllerContract.simulatePayloadExecutionOnTenderly(payload.payloadId, config);
      payloads.push({ payload: config, simulation: result });
    } catch (e) {
      console.log('error simulating payload');
    }
  }
  return { proposal, payloads };
}
