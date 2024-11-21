import 'dotenv/config';
import {ChainId, ChainList, getRPCUrl} from '@bgd-labs/rpc-env';
import {createClient, http} from 'viem';

export function getClient(chainId: number) {
  const chain = ChainList[chainId as keyof typeof ChainList];
  if (!chain) return undefined;
  return createClient({
    transport: http(
      getRPCUrl(ChainId.mainnet, {
        alchemyKey: process.env.ALCHEMY_API_KEY,
      })!,
    ),
    chain,
  });
}
