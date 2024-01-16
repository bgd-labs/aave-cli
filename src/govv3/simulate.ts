import { logInfo } from '../utils/logger';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { getGovernance } from './governance';
import { Hex, PublicClient } from 'viem';
import { PayloadsController, getPayloadsController } from './payloadsController';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';
import { generateReport } from './generatePayloadReport';
import { generateProposalReport } from './generateProposalReport';

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
  const result = await governance.simulateProposalExecutionOnTenderly(proposalId, proposal);
  // console.log(
  //   await generateProposalReport({
  //     simulation: result,
  //     proposalId: proposalId,
  //     proposalInfo: proposal,
  //     publicClient: publicClient,
  //   })
  // );
  const payloads: {
    payload: Awaited<ReturnType<PayloadsController['getPayload']>>;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const payload of proposal.proposal.payloads) {
    const controllerContract = getPayloadsController(
      payload.payloadsController,
      CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP]
    );
    const logs = await controllerContract.cacheLogs();
    const config = await controllerContract.getPayload(payload.payloadId, logs);
    try {
      const result = await controllerContract.simulatePayloadExecutionOnTenderly(payload.payloadId, config);
      console.log(
        JSON.stringify(
          {
            simulation: result,
            payloadId: payload.payloadId,
            payloadInfo: config,
          },
          (key, value) => (typeof value === 'bigint' ? value.toString() : value)
        )
      );
      // console.log(
      //   await generateReport({
      //     simulation: result,
      //     payloadId: payload.payloadId,
      //     payloadInfo: config,
      //     publicClient: CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP],
      //   })
      // );
      payloads.push({ payload: config, simulation: result });
    } catch (e) {
      console.log('error simulating payload');
      console.log(e);
    }
  }
  return { proposal, payloads };
}
