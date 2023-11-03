import { GetLogsReturnType, Hex, Log, PublicClient } from 'viem';
import type { Abi, AbiEvent } from 'abitype';
import { logInfo } from './logger';
import { readJSONCache, writeJSONCache } from './cache';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

export type LogWithTimestamp<
  TAbiEvent extends AbiEvent | undefined = undefined,
  TAbiEvents extends readonly AbiEvent[] | readonly unknown[] | undefined = TAbiEvent extends AbiEvent
    ? [TAbiEvent]
    : undefined
> = ArrayElement<GetLogsReturnType<TAbiEvent, TAbiEvents>> & { timestamp: number };

/**
 * Fetches the logs and stores them in a cache folder.
 * @param client
 * @param filter
 * @returns logs
 */
export async function getLogs<TAbiEvents extends AbiEvent[] | undefined>(
  client: PublicClient,
  events: TAbiEvents,
  address: Hex,
  searchStartBlock?: bigint
): Promise<Array<LogWithTimestamp<undefined, TAbiEvents>>> {
  const currentBlock = await client.getBlockNumber();
  /**
   * need to specify range as some node prividers (e.g. default on base) throw range error on filter creation
   */
  const filePath = client.chain!.id.toString();
  const fileName = address;
  // read stale cache if it exists
  const cache: Array<LogWithTimestamp<undefined, TAbiEvents>> = readJSONCache(filePath, fileName) || [];
  const startBlock =
    cache.length > 0
      ? BigInt(cache[cache.length - 1].blockNumber as bigint) + 1n
      : searchStartBlock
      ? searchStartBlock
      : (await findContractDeploymentBlock(client, 0n, currentBlock, address)) || 0n;
  const logs = await getPastLogsRecursive(client, startBlock, currentBlock, events, address);
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
    logInfo(client.chain?.name!, `Store ${newLogs.length} logs for event: ${address} on chainId: ${client.chain!.id}`);
    writeJSONCache(filePath, fileName, combinedCache);
    return combinedCache;
  } else {
    logInfo(client.chain?.name!, 'no new logs found');
  }
  return cache;
}

/**
 * fetches logs recursively
 */
export async function getPastLogsRecursive<TAbiEvents extends AbiEvent[] | undefined>(
  client: PublicClient,
  fromBlock: bigint,
  toBlock: bigint,
  events: TAbiEvents,
  address: Hex
): Promise<GetLogsReturnType<undefined, TAbiEvents>> {
  logInfo(client.chain?.name!, `looking for logs between ${fromBlock} to ${toBlock}`);
  if (fromBlock <= toBlock) {
    try {
      return await client.getLogs({ fromBlock, toBlock, events, address });
    } catch (error) {
      const midBlock = BigInt(fromBlock + toBlock) >> BigInt(1);
      const arr1 = await getPastLogsRecursive(client, fromBlock, midBlock, events, address);
      const arr2 = await getPastLogsRecursive(client, midBlock + BigInt(1), toBlock, events, address);
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
