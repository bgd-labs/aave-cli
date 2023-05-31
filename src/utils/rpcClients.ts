// import 'dotenv/config';
import { createPublicClient, http } from 'viem';
import { mainnet, arbitrum, polygon, optimism, metis } from 'viem/chains';

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_MAINNET),
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
