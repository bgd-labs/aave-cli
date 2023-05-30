import { GetFilterLogsParameters, GetFilterLogsReturnType, PublicClient } from 'viem';
import type { Abi } from 'abitype';
import fs from 'fs';
import path from 'path';

/**
 * Fetches the logs and stores them in a cache folder.
 * @param client
 * @param filter
 * @returns logs
 */
export async function getLogs<TAbi extends Abi | readonly unknown[], TEventName extends string | undefined>(
  client: PublicClient,
  filterFn: (from, to) => Promise<GetFilterLogsParameters<TAbi, TEventName>['filter']>
): Promise<GetFilterLogsReturnType<TAbi, TEventName>> {
  // create .tmp folder if doesn't exist yet
  const cachePath = path.join(process.cwd(), '.tmp', client.chain!.id.toString());
  const currentBlock = await client.getBlockNumber();
  const filter = await filterFn(0, currentBlock);
  const filePath = path.join(cachePath, filter.eventName + '.json');
  if (!fs.existsSync(cachePath)) {
    console.log('creating tmp folder');
    fs.mkdirSync(cachePath, { recursive: true });
  }
  // read stale cache if it exists
  const cache: GetFilterLogsReturnType<TAbi, TEventName> = fs.existsSync(filePath)
    ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
    : [];
  const logs = await getPastLogsRecursive(
    client,
    cache.length > 1 ? (cache[cache.length - 1].blockNumber as bigint) : 0n,
    currentBlock,
    filterFn
  );
  const combinedCache = [
    ...cache,
    ...logs.filter((l) => !cache.find((c) => l.transactionHash === c.transactionHash && l.logIndex === c.logIndex)),
  ].sort((a, b) =>
    a.blockNumber !== b.blockNumber
      ? Number(a.blockNumber) - Number(b.blockNumber)
      : Number(a.logIndex) - Number(b.logIndex)
  );
  console.log(`store logs for event: ${filter.eventName} on chainId: ${client.chain!.id}`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(combinedCache, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2)
  );
  return combinedCache;
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
  filterFn: (from, to) => Promise<GetFilterLogsParameters<TAbi, TEventName>['filter']>
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
