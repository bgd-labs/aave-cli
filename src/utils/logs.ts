import { Block, GetFilterLogsParameters, GetFilterLogsReturnType, Hex, PublicClient } from 'viem';
import type { Abi } from 'abitype';
import { logInfo } from './logger';
import { readJSONCache, writeJSONCache } from './cache';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

export type FilterLogWithTimestamp<TAbi extends Abi, TEventName extends string> = ArrayElement<
  GetFilterLogsReturnType<TAbi, TEventName>
> & { timestamp: number };

/**
 * Fetches the logs and stores them in a cache folder.
 * @param client
 * @param filter
 * @returns logs
 */
export async function getLogs<TAbi extends Abi, TEventName extends string>(
  client: PublicClient,
  filterFn: (from: bigint, to?: bigint) => Promise<GetFilterLogsParameters<TAbi, TEventName>['filter']>,
  address: Hex
): Promise<Array<FilterLogWithTimestamp<TAbi, TEventName>>> {
  const currentBlock = await client.getBlockNumber();
  const filter = await filterFn(0n, 1n);
  const filePath = client.chain!.id.toString();
  const fileName = filter.eventName!;
  // read stale cache if it exists
  const cache: Array<FilterLogWithTimestamp<TAbi, TEventName>> = readJSONCache(filePath, fileName) || [];
  const startBlock =
    cache.length > 0
      ? BigInt(cache[cache.length - 1].blockNumber as bigint) + 1n
      : (await findContractDeploymentBlock(client, 0n, currentBlock, address)) || 0n;
  const logs = await getPastLogsRecursive(client, startBlock, currentBlock, filterFn);
  const newLogs = await Promise.all(
    logs
      .filter(
        (l) => !cache.find((c) => l.transactionHash === c.transactionHash && Number(l.logIndex) === Number(c.logIndex))
      )
      .map(async (l) => ({
        ...l,
        timestamp: Number((await client.getBlock({ blockNumber: l.blockNumber as bigint })).timestamp),
      }))
  );
  if (newLogs.length) {
    const combinedCache = [...cache, ...newLogs].sort((a, b) =>
      a.blockNumber !== b.blockNumber
        ? Number(a.blockNumber) - Number(b.blockNumber)
        : Number(a.logIndex) - Number(b.logIndex)
    );
    logInfo(
      client.chain?.name!,
      `Store ${newLogs.length} logs for event: ${filter.eventName} on chainId: ${client.chain!.id}`
    );
    writeJSONCache(filePath, fileName, combinedCache);
    return combinedCache;
  }
  return cache;
}

/**
 * fetches logs recursively
 */
export async function getPastLogsRecursive<
  TAbi extends Abi | readonly unknown[],
  TEventName extends string | undefined
>(
  client: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
  filterFn: (from: bigint, to?: bigint) => Promise<GetFilterLogsParameters<TAbi, TEventName>['filter']>
): Promise<GetFilterLogsReturnType<TAbi, TEventName>> {
  if (fromBlock <= toBlock) {
    try {
      return await client.getFilterLogs({
        filter: await filterFn(fromBlock, toBlock),
      });
    } catch (error) {
      const midBlock = BigInt(fromBlock + toBlock) >> BigInt(1);
      const arr1 = await getPastLogsRecursive(client, fromBlock, midBlock, filterFn);
      const arr2 = await getPastLogsRecursive(client, midBlock + BigInt(1), toBlock, filterFn);
      return [...arr1, ...arr2];
    }
  }
  return [];
}

/**
 * some rpcs are having problems fetching logs from 0, therefore this methods helps finding a block close to contract deployment
 * 200k block error is allowed
 * @param client
 * @param address
 */
export async function findContractDeploymentBlock(
  client: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
  address: Hex
) {
  if (fromBlock <= toBlock) {
    const midBlock = BigInt(fromBlock + toBlock) >> BigInt(1);
    const codeMid = await client.getBytecode({ blockNumber: midBlock, address });
    if (!codeMid) {
      if (toBlock - midBlock > 200000n) {
        return findContractDeploymentBlock(client, midBlock, toBlock, address);
      } else {
        return midBlock;
      }
    }
    return findContractDeploymentBlock(client, fromBlock, midBlock, address);
  }
  throw new Error('Could not find contract deployment block');
}
