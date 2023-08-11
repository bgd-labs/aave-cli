// import 'dotenv/config';
import { createPublicClient, http, fallback } from 'viem';
import {
  mainnet,
  arbitrum,
  polygon,
  optimism,
  metis,
  base as basenet,
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

export const basenetClient = createPublicClient({
  chain: basenet,
  transport: http(process.env.RPC_BASENET),
});
