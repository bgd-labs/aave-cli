import { logInfo } from '../utils/logger';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { getGovernance } from './governance';
import { Hex, PublicClient } from 'viem';
import { PayloadsController, getPayloadsController } from './payloadsController';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';
import { generateReport } from './generatePayloadReport';
import { generateProposalReport } from './generateProposalReport';
import { cacheGovernance, cachePayloadsController, readBookKeepingCache } from './cache/updateCache';

/**
 * Reference implementation, unused
 * @param governanceAddress
 * @param publicClient
 * @param proposalId
 * @returns
 */
export async function simulateProposal(governanceAddress: Hex, publicClient: PublicClient, proposalId: bigint) {
  const cache = readBookKeepingCache();
  logInfo('General', `Running simulation for ${proposalId}`);
  const governance = getGovernance({ address: governanceAddress, publicClient });
  const { eventsCache } = await cacheGovernance(publicClient, governanceAddress, cache);
  const proposal = await governance.getProposalAndLogs(proposalId, eventsCache);
  const result = await governance.simulateProposalExecutionOnTenderly(proposalId, proposal);
  console.log(
    await generateProposalReport({
      simulation: result,
      proposalId: proposalId,
      proposalInfo: proposal,
      publicClient: publicClient,
    })
  );
  const payloads: {
    payload: Awaited<ReturnType<PayloadsController['getPayload']>>;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const payload of proposal.proposal.payloads) {
    const client = CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP];
    const controllerContract = getPayloadsController(payload.payloadsController, client);
    const { eventsCache } = await cachePayloadsController(client, payload.payloadsController, cache);
    const config = await controllerContract.getPayload(payload.payloadId, eventsCache);
    try {
      const result = await controllerContract.simulatePayloadExecutionOnTenderly(payload.payloadId, config);
      console.log(
        await generateReport({
          simulation: result,
          payloadId: payload.payloadId,
          payloadInfo: config,
          publicClient: CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP],
        })
      );
      payloads.push({ payload: config, simulation: result });
    } catch (e) {
      console.log('error simulating payload');
      console.log(e);
    }
  }
  return { proposal, payloads };
}
