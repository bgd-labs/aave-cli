import * as addresses from '@bgd-labs/aave-address-book';
import {IPool_ABI} from '@bgd-labs/aave-address-book';
import {findObjectPaths} from 'find-object-paths';
import {type Address, type Client, HDKey, type Hex, getAddress, getContract} from 'viem';

/**
 * Checks if address is listed on address-book
 * @param value
 * @param chainId
 * @returns string[] found paths to address-book addresses
 */
export function isKnownAddress(value: Address, chainId: number): string[] | void {
  // glob imports have no object properties
  // therefore we recreate the object via spread & remove addresses unrelated to the chain we are checking
  const transformedAddresses = Object.keys(addresses).reduce(
    (acc, key) => {
      if ((addresses as any)[key].CHAIN_ID === chainId) acc[key] = {...(addresses as any)[key]};
      return acc;
    },
    {} as {[key: string]: any},
  );
  // while on address book we have checksummed addresses tenderly returns non check summed
  // therefore we checksum the needle to have exact matches
  const results = findObjectPaths(transformedAddresses, {value: getAddress(value)});
  if (typeof results === 'string') return [results];
  return results;
}

export function findPayloadsController(chainId: number): Address | void {
  const key = Object.keys(addresses).find(
    (key) =>
      (addresses[key as keyof typeof addresses] as any).CHAIN_ID === chainId &&
      (addresses[key as keyof typeof addresses] as any).PAYLOADS_CONTROLLER,
  );
  if (key) return (addresses[key as keyof typeof addresses] as any).PAYLOADS_CONTROLLER;
}

type AssetInfo = {symbol: string; decimals: number};

const assetsCache = (Object.keys(addresses) as (keyof typeof addresses)[]).reduce<
  Record<number, Record<Hex, AssetInfo>>
>((acc, key) => {
  if (!(addresses[key] as any).ASSETS) return acc;
  const pool = addresses[key] as typeof addresses.AaveV2Ethereum;
  if (!acc[pool.CHAIN_ID]) acc[pool.CHAIN_ID] = {};
  Object.keys(pool.ASSETS).map((symbol) => {
    const asset = pool.ASSETS[symbol as keyof typeof pool.ASSETS];
    acc[pool.CHAIN_ID][asset.UNDERLYING] = {decimals: asset.decimals, symbol};
  });
  return acc;
}, {});

export async function findAsset(client: Client, address: Hex) {
  const chainId = client.chain!.id;
  const asset = assetsCache[chainId][address];
  if (asset) return asset;
  const erc20Contract = getContract({client, address: address, abi: addresses.IERC20Detailed_ABI});
  let symbol = 'unknown';
  let decimals = 0;
  try {
    symbol = await erc20Contract.read.symbol();
  } catch (e) {}
  try {
    decimals = await erc20Contract.read.decimals();
  } catch (e) {}
  assetsCache[chainId][address] = {
    symbol,
    decimals,
  };
  return assetsCache[chainId][address];
}

let cachedReservesList: readonly Hex[] = [];

export async function assetIndexesToAsset(
  client: Client,
  poolAddress: Hex,
  indexes: number[],
): Promise<string[]> {
  if (!cachedReservesList.length)
    cachedReservesList = await getContract({
      client,
      abi: IPool_ABI,
      address: poolAddress,
    }).read.getReservesList();
  return await Promise.all(
    indexes.map(async (index) => {
      if (index < cachedReservesList.length) {
        const reserve = cachedReservesList[index];
        return `${(await findAsset(client, reserve)).symbol}(id: ${index})`;
      }
      return `unknown(id: ${index})`;
    }),
  );
}
