import type {Client, Hex} from 'viem';
import {logInfo} from '../utils/logger';
import type {TenderlySimulationResponse} from '../utils/tenderlyClient';
import {generateReport} from './generatePayloadReport';
import {generateProposalReport} from './generateProposalReport';
import {getGovernance} from './governance';
import {getPayloadsController} from './payloadsController';
import {refreshCache} from '@bgd-labs/aave-v3-governance-cache/refreshCache';
import {GetPayloadReturnType} from '@bgd-labs/aave-v3-governance-cache';
import {customStorageProvider} from '@bgd-labs/aave-v3-governance-cache/customStorageProvider';
import {fileSystemStorageAdapter} from '@bgd-labs/aave-v3-governance-cache/fileSystemStorageAdapter';
import {getClient} from '../utils/getClient';

const localCacheAdapter = customStorageProvider(fileSystemStorageAdapter);
/**
 * Reference implementation, unused
 * @param governanceAddress
 * @param client
 * @param proposalId
 * @returns
 */
export async function simulateProposal(governanceAddress: Hex, client: Client, proposalId: bigint) {
  logInfo('General', `Running simulation for ${proposalId}`);
  const governance = getGovernance({address: governanceAddress, client});
  await refreshCache(localCacheAdapter);
  const proposal = await localCacheAdapter.getProposal({
    chainId: client.chain!.id,
    governance: governanceAddress,
    proposalId,
  });
  const result = await governance.simulateProposalExecutionOnTenderly(proposalId, proposal.logs);
  console.log(
    await generateProposalReport({
      simulation: result,
      proposalId: proposalId,
      proposalInfo: proposal,
      client,
    }),
  );
  const payloads: {
    payload: GetPayloadReturnType;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const payload of proposal.proposal.payloads) {
    const client = getClient(Number(payload.chain))!;
    const controllerContract = getPayloadsController(payload.payloadsController, client);
    const cache = await localCacheAdapter.getPayload({
      payloadId: payload.payloadId,
      chainId: Number(payload.chain),
      payloadsController: payload.payloadsController,
    });
    try {
      const result = await controllerContract.simulatePayloadExecutionOnTenderly(
        payload.payloadId,
        cache.logs,
      );
      console.log(
        await generateReport({
          simulation: result,
          payloadId: payload.payloadId,
          payloadInfo: cache,
          client: getClient(Number(payload.chain))!,
        }),
      );
      payloads.push({payload: cache, simulation: result});
    } catch (e) {
      console.log('error simulating payload');
      console.log(e);
    }
  }
  return {proposal, payloads};
}
