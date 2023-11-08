import { readJSONCache, writeJSONCache } from '../utils/cache';
import { ProposalMetadata, getProposalMetadata } from './parseIpfs';

/**
 * Slim caching layer on top of ipfs fetcher to speed up fetching of ipfs data
 */
export async function getCachedIpfs(hash: string) {
  const cache = readJSONCache<ProposalMetadata>('ipfs', hash);
  if (cache) return cache;
  const content = await getProposalMetadata(hash);
  writeJSONCache('ipfs', hash, content);
  return content;
}
