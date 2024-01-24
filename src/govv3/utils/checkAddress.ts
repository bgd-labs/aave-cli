import { findObjectPaths } from 'find-object-paths';
import { Address, getAddress } from 'viem';
import * as addresses from '@bgd-labs/aave-address-book';
import { ChainId } from '@bgd-labs/js-utils';

/**
 * Checks if address is listed on address-book
 * @param value
 * @param chainId
 * @returns string[] found paths to address-book addresses
 */
export function isKnownAddress(value: Address, chainId: keyof typeof ChainId): string[] | void {
  // glob imports have no object properties
  // therefore we recreate the object via spread & remove addresses unrelated to the chain we are checking
  const transformedAddresses = Object.keys(addresses).reduce((acc, key) => {
    if ((addresses as any)[key].CHAIN_ID == chainId) acc[key] = { ...(addresses as any)[key] };
    return acc;
  }, {} as { [key: string]: any });
  // while on address book we have checksummed addresses tenderly returns non check summed
  // therefore we checksum the needle to have exact matches
  const results = findObjectPaths(transformedAddresses, { value: getAddress(value) });
  if (typeof results === 'string') return [results];
  return results;
}
