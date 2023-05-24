import { createPublicClient, http } from "viem";
import { mainnet, arbitrum } from "viem/chains";

export const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_MAINNET),
});

export const arbitrumClient = createPublicClient({
  chain: arbitrum,
  transport: http(process.env.RPC_ARBITRUM),
});
