import {
  CHAIN_ID_CLIENT_MAP,
  ProposalMetadata,
  getBlockAtTimestamp,
  getProposalMetadata,
  readJSONCache,
  writeJSONCache,
} from '@bgd-labs/js-utils';
import { getGovernanceEvents, isProposalFinal } from './modules/governance';
import { getPayloadsControllerEvents, isPayloadFinal } from './modules/payloadsController';
import { AbiStateMutability, Address, Client, ContractFunctionReturnType, getContract } from 'viem';
import { IGovernanceCore_ABI, IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import { getBlockNumber } from 'viem/actions';

export async function cacheGovernance(
  client: Client,
  governanceAddress: Address,
  bookKeepingCache: BookKeepingCache
): Promise<{
  proposalsCache: Record<
    string,
    ContractFunctionReturnType<typeof IGovernanceCore_ABI, AbiStateMutability, 'getProposal'>
  >;
  eventsCache: Awaited<ReturnType<typeof getGovernanceEvents>>;
}> {
  const bookKeepingCacheId = 'governance';
  const currentBlockOnGovernanceChain = await getBlockNumber(client);
  const contract = getContract({
    abi: IGovernanceCore_ABI,
    address: governanceAddress,
    client,
  });
  const proposalsCount = await contract.read.getProposalsCount();
  if (proposalsCount == BigInt(0)) {
    bookKeepingCache[bookKeepingCacheId] = currentBlockOnGovernanceChain.toString();
    return {
      proposalsCache: {},
      eventsCache: [],
    };
  }
  // cache data
  const proposalsPath = `${client.chain!.id.toString()}/proposals`;
  const proposalsCache =
    readJSONCache<
      Record<string, ContractFunctionReturnType<typeof IGovernanceCore_ABI, AbiStateMutability, 'getProposal'>>
    >(proposalsPath, governanceAddress) || {};
  const proposalsToCheck = [...Array(Number(proposalsCount)).keys()];
  for (let i = 0; i < proposalsToCheck.length; i++) {
    if (!proposalsCache[i] || !isProposalFinal(proposalsCache[i].state)) {
      proposalsCache[i] = await contract.read.getProposal([BigInt(i)]);
    }
  }
  writeJSONCache(proposalsPath, governanceAddress, proposalsCache);

  // cache events
  const eventsPath = `${client.chain!.id.toString()}/events`;
  const governanceEvents =
    readJSONCache<Awaited<ReturnType<typeof getGovernanceEvents>>>(eventsPath, governanceAddress) || [];
  const lastSeenBlock = bookKeepingCache[bookKeepingCacheId]
    ? BigInt(bookKeepingCache[bookKeepingCacheId])
    : (
        await getBlockAtTimestamp({
          client: client,
          timestamp: BigInt(proposalsCache[0].creationTime),
          fromBlock: BigInt(0),
          toBlock: currentBlockOnGovernanceChain,
          maxDelta: BigInt(60 * 60 * 24),
        })
      ).number;
  const logs = await getGovernanceEvents(
    governanceAddress,
    client,
    BigInt(lastSeenBlock) + BigInt(1),
    currentBlockOnGovernanceChain
  );
  const eventsCache = [...governanceEvents, ...logs];
  writeJSONCache(eventsPath, governanceAddress, eventsCache);
  bookKeepingCache[bookKeepingCacheId] = currentBlockOnGovernanceChain.toString();
  return { proposalsCache, eventsCache };
}

export async function cachePayloadsController(
  client: Client,
  payloadsControllerAddress: Address,
  bookKeepingCache: BookKeepingCache
) {
  const payloadsPath = `${client.chain!.id}/payloads`;
  const contract = getContract({
    abi: IPayloadsControllerCore_ABI,
    client,
    address: payloadsControllerAddress,
  });
  const payloadsCount = await contract.read.getPayloadsCount();

  const currentBlockOnPayloadsControllerChain = await getBlockNumber(client);
  if (payloadsCount == 0) {
    bookKeepingCache[payloadsPath] = currentBlockOnPayloadsControllerChain.toString();
    return { eventsCache: [] };
  }
  // cache data
  const payloadsCache =
    readJSONCache<
      Record<
        number,
        ContractFunctionReturnType<typeof IPayloadsControllerCore_ABI, AbiStateMutability, 'getPayloadById'>
      >
    >(payloadsPath, payloadsControllerAddress) || {};
  const payloadsToCheck = [...Array(Number(payloadsCount)).keys()];
  for (let i = 0; i < payloadsToCheck.length; i++) {
    if (!payloadsCache[i] || !isPayloadFinal(payloadsCache[i].state)) {
      payloadsCache[i] = await contract.read.getPayloadById([i]);
    }
  }
  writeJSONCache(payloadsPath, payloadsControllerAddress, payloadsCache);
  // cache events
  const eventsPath = `${client.chain!.id}/events`;
  const eventsCache =
    readJSONCache<Awaited<ReturnType<typeof getPayloadsControllerEvents>>>(eventsPath, payloadsControllerAddress) || [];
  const lastSeenBlock = bookKeepingCache[payloadsPath]
    ? BigInt(bookKeepingCache[payloadsPath])
    : (
        await getBlockAtTimestamp({
          client: client,
          timestamp: BigInt(payloadsCache[0].createdAt),
          fromBlock: BigInt(0),
          toBlock: currentBlockOnPayloadsControllerChain,
          maxDelta: BigInt(60 * 60), // 1h
        })
      ).number;
  const logs = await getPayloadsControllerEvents(
    payloadsControllerAddress,
    client,
    BigInt(lastSeenBlock) + BigInt(1),
    currentBlockOnPayloadsControllerChain
  );
  const updatedEventsCache = [...eventsCache, ...logs];
  writeJSONCache(eventsPath, payloadsControllerAddress, updatedEventsCache);
  bookKeepingCache[payloadsPath] = currentBlockOnPayloadsControllerChain.toString();
  return { eventsCache: updatedEventsCache };
}

export async function cachePayloadsControllers(controllers: Map<Address, number>, bookKeepingCache: BookKeepingCache) {
  return await Promise.all(
    Array.from(controllers).map(async ([address, chainId]) =>
      cachePayloadsController(CHAIN_ID_CLIENT_MAP[chainId], address, bookKeepingCache)
    )
  );
}

/**
 * simple cache mapping:
 * filename:blockNumber with the last used block for caching
 */
type BookKeepingCache = Record<string, string>;

export function readBookKeepingCache() {
  return readJSONCache<BookKeepingCache>('bookKeeping', 'lastFetchedBlocks') || {};
}

export function writeBookKeepingCache(cache: BookKeepingCache) {
  writeJSONCache('bookKeeping', 'lastFetchedBlocks', cache);
}
