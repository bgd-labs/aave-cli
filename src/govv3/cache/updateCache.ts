import { CHAIN_ID_CLIENT_MAP, getBlockAtTimestamp, readJSONCache, writeJSONCache } from '@bgd-labs/js-utils';
import { getGovernanceEvents } from './modules/governance';
import { getPayloadsControllerEvents, isPayloadFinal } from './modules/payloadsController';
import { AbiStateMutability, Address, Client, ContractFunctionReturnType, getContract } from 'viem';
import { IGovernanceCore_ABI, IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import { getBlockNumber } from 'viem/actions';
import { isProposalFinal } from '../governance';

export async function cacheGovernance(
  client: Client,
  governanceAddress: Address
): Promise<{
  proposalsCache: Record<
    string,
    ContractFunctionReturnType<typeof IGovernanceCore_ABI, AbiStateMutability, 'getProposal'>
  >;
  eventsCache: Awaited<ReturnType<typeof getGovernanceEvents>>;
}> {
  const proposalsPath = `${client.chain!.id.toString()}/proposals`;
  const cachedBlock: { lastSeenBlock: string } =
    readJSONCache<{ lastSeenBlock: number }>(proposalsPath, 'lastSeenBlock') || {};
  const currentBlockOnGovernanceChain = await getBlockNumber(client);
  const contract = getContract({
    abi: IGovernanceCore_ABI,
    address: governanceAddress,
    client,
  });
  const proposalsCount = await contract.read.getProposalsCount();
  if (proposalsCount == BigInt(0)) {
    cachedBlock.lastSeenBlock = currentBlockOnGovernanceChain.toString();
    return {
      proposalsCache: {},
      eventsCache: [],
    };
  }
  // cache data
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
  const lastSeenBlock = cachedBlock.lastSeenBlock
    ? BigInt(cachedBlock.lastSeenBlock)
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
  cachedBlock.lastSeenBlock = currentBlockOnGovernanceChain.toString();
  writeJSONCache(proposalsPath, 'lastSeenBlock', cachedBlock);
  writeJSONCache(eventsPath, governanceAddress, eventsCache);
  return { proposalsCache, eventsCache };
}

export async function cachePayloadsController(client: Client, payloadsControllerAddress: Address) {
  const payloadsPath = `${client.chain!.id}/payloads`;
  const cachedBlock: { lastSeenBlock: string } =
    readJSONCache<{ lastSeenBlock: number }>(payloadsPath, 'lastSeenBlock') || {};
  const contract = getContract({
    abi: IPayloadsControllerCore_ABI,
    client,
    address: payloadsControllerAddress,
  });
  const payloadsCount = await contract.read.getPayloadsCount();

  const currentBlockOnPayloadsControllerChain = await getBlockNumber(client);
  if (payloadsCount == 0) {
    cachedBlock.lastSeenBlock = currentBlockOnPayloadsControllerChain.toString();
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
  const lastSeenBlock = cachedBlock
    ? BigInt(cachedBlock.lastSeenBlock)
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
  cachedBlock.lastSeenBlock = currentBlockOnPayloadsControllerChain.toString();
  writeJSONCache(eventsPath, payloadsControllerAddress, updatedEventsCache);
  writeJSONCache(payloadsPath, 'lastSeenBlock', cachedBlock);
  return { eventsCache: updatedEventsCache };
}

export async function cachePayloadsControllers(controllers: Map<Address, number>) {
  return await Promise.all(
    Array.from(controllers).map(async ([address, chainId]) =>
      cachePayloadsController(CHAIN_ID_CLIENT_MAP[chainId], address)
    )
  );
}
