import { createPublicClient, http, fallback, PublicClient } from 'viem';
import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  metis,
  base,
  sepolia,
  goerli,
  bsc,
  fantom,
  avalanche,
  gnosis,
} from 'viem/chains';

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: fallback([http(), http(process.env.RPC_MAINNET)]),
});

export const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.RPC_ARBITRUM),
});

export const polygonClient = createPublicClient({
  chain: polygon,
  transport: http(process.env.RPC_POLYGON),
});

export const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(process.env.RPC_OPTIMISM),
});

export const metisClient = createPublicClient({
  chain: metis,
  transport: http(process.env.RPC_METIS),
});

export const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_BASE),
});

export const fantomClient = createPublicClient({
  chain: fantom,
  transport: http(process.env.RPC_FANTOM),
});

export const bnbClient = createPublicClient({
  chain: bsc,
  transport: http(process.env.RPC_BNB),
});

export const avalancheClient = createPublicClient({
  chain: avalanche,
  transport: http(process.env.RPC_AVALANCHE),
});

export const gnosisClient = createPublicClient({
  chain: gnosis,
  transport: http(process.env.RPC_GNOSIS),
});

export const sepoliaClient = createPublicClient({ chain: sepolia, transport: http(process.env.RPC_SEPOLIA) });

export const goerliClient = createPublicClient({ chain: goerli, transport: http(process.env.RPC_GOERLI) });

export const CHAIN_ID_CLIENT_MAP: Record<number, PublicClient> = {
  [mainnet.id]: mainnetClient,
  [arbitrum.id]: arbitrumClient,
  [polygon.id]: polygonClient,
  [optimism.id]: optimismClient as PublicClient,
  [metis.id]: metisClient,
  [base.id]: baseClient as PublicClient,
  [sepolia.id]: sepoliaClient,
  [goerli.id]: goerliClient,
  [fantom.id]: fantomClient,
  [bsc.id]: bnbClient,
  [avalanche.id]: avalancheClient,
  [gnosis.id]: gnosisClient,
} as const;
