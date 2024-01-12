import { GetLogsReturnType, Hex, Log, PublicClient } from 'viem';
import type { Abi, AbiEvent } from 'abitype';
import { logInfo } from './logger';
import { getContractDeploymentBlock, getLogs, readJSONCache, writeJSONCache } from '@bgd-labs/js-utils';

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
export async function getAndCacheLogs<TAbiEvents extends AbiEvent[] | undefined>(
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
      : (await getContractDeploymentBlock({
          client,
          fromBlock: 0n,
          toBlock: currentBlock,
          contractAddress: address,
          maxDelta: 10000n,
        })) || 0n;
  const logs = await getLogs({ client, fromBlock: startBlock, toBlock: currentBlock, events, address });
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
