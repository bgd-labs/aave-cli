import { AaveV3Sepolia } from '@bgd-labs/aave-address-book';
import { logError, logInfo, logSuccess } from '../../utils/logger';
import { TenderlySimulationResponse } from '../../utils/tenderlyClient';
import { getGovernance } from './governance';
import { Hex, createPublicClient, http } from 'viem';
import { sepolia, polygonMumbai, bscTestnet, avalancheFuji } from 'viem/chains';
import { PayloadsController, getPayloadsController } from './payloadsController';
import { generateReport } from './generatePayloadReport';

const CHAIN_ID_CLIENT_MAP = {
  [sepolia.id]: {
    client: createPublicClient({ chain: sepolia, transport: http(process.env.RPC_SEPOLIA) }),
    blockCreated: 3967960n,
  },
  [polygonMumbai.id]: {
    client: createPublicClient({ chain: polygonMumbai, transport: http(process.env.RPC_POLYGON_MUMBAI) }),
    blockCreated: 38318051n,
  },
  [bscTestnet.id]: {
    client: createPublicClient({ chain: bscTestnet, transport: http(process.env.RPC_BSC_TESTNET) }),
    blockCreated: 31893040n,
  },
  [avalancheFuji.id]: {
    client: createPublicClient({ chain: avalancheFuji, transport: http(process.env.RPC_AVALANCHE_FUJI) }),
    blockCreated: 24512916n,
  },
} as const;

export async function simulateProposal(governanceAddress: Hex, proposalId: bigint) {
  logInfo('General', `Running simulation for ${proposalId}`);
  const governance = getGovernance(
    governanceAddress,
    createPublicClient({ chain: sepolia, transport: http(process.env.RPC_SEPOLIA) }),
    3962575n
  );
  const logs = await governance.cacheLogs();
  const proposal = await governance.getProposal(proposalId, logs);
  const payloads: {
    payload: Awaited<ReturnType<PayloadsController['getPayload']>>;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const payload of proposal.proposal.payloads) {
    const controllerContract = getPayloadsController(
      payload.payloadsController,
      CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP].client,
      CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP].blockCreated
    );
    const logs = await controllerContract.cacheLogs();
    const config = await controllerContract.getPayload(payload.payloadId, logs);
    const result = await controllerContract.simulatePayloadExecutionOnTenderly(payload.payloadId, config);
    console.log(
      await generateReport({
        payloadId: payload.payloadId,
        payloadInfo: config,
        simulation: result,
        publicClient: CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP].client,
      })
    );
    payloads.push({ payload: config, simulation: result });
  }
  return { proposal, payloads };
}
