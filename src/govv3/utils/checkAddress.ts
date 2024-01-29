import { findObjectPaths } from 'find-object-paths';
import { Address, getAddress } from 'viem';
import * as addresses from '@bgd-labs/aave-address-book';

/**
 * Checks if address is listed on address-book
 * @param value
 * @param chainId
 * @returns string[] found paths to address-book addresses
 */
export function isKnownAddress(value: Address, chainId: number): string[] | void {
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

export function findPayloadsController(chainId: number): Address | void {
  const key = Object.keys(addresses).find(
    (key) =>
      (addresses[key as keyof typeof addresses] as any).CHAIN_ID === chainId &&
      (addresses[key as keyof typeof addresses] as any).PAYLOADS_CONTROLLER
  );
  if (key) return (addresses[key as keyof typeof addresses] as any).PAYLOADS_CONTROLLER;
}
