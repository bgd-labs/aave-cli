import 'dotenv/config';
import {ChainId, ChainList, getRPCUrl} from '@bgd-labs/rpc-env';
import {createClient, http} from 'viem';

export function getClient(chainId: number) {
  const chain = ChainList[chainId as keyof typeof ChainList];
  if (!chain) return;
  return createClient({
    transport: http(
      getRPCUrl(chainId as any, {
        alchemyKey: process.env.ALCHEMY_API_KEY,
      })!,
    ),
    chain,
  });
}
