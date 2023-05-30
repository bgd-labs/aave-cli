import {
  Hex,
  pad,
  keccak256,
  encodeAbiParameters,
  parseAbiParameters,
  trim,
  fromHex,
  toHex,
  toBytes,
  concat,
} from 'viem';
/**
 * @notice Returns the storage slot for a Solidity mapping with bytes32 keys, given the slot of the mapping itself
 * @dev Read more at https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#mappings-and-dynamic-arrays
 * @param mappingSlot Mapping slot in storage
 * @param key Mapping key to find slot for
 * @returns Storage slot
 */
export function getSolidityStorageSlotBytes(mappingSlot: Hex, key: Hex) {
  const slot = pad(mappingSlot, { size: 32 });
  return trim(keccak256(encodeAbiParameters(parseAbiParameters('bytes32, uint256'), [key, BigInt(slot)])));
}

/**
 * @notice Returns the storage slot for a Solidity mapping with uint keys, given the slot of the mapping itself
 * @dev Read more at https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html#mappings-and-dynamic-arrays
 * @param mappingSlot Mapping slot in storage
 * @param key Mapping key to find slot for
 * @returns Storage slot
 */
export function getSolidityStorageSlotUint(mappingSlot: bigint, key: bigint) {
  // this will also work for address types, since address and uints are encoded the same way
  // const slot = pad(mappingSlot, { size: 32 });
  return keccak256(encodeAbiParameters(parseAbiParameters('uint256, uint256'), [key, mappingSlot]));
}

export function getDynamicArraySlot(baseSlot: bigint, arrayIndex: number, itemSize: number) {
  return pad(
    toHex(
      fromHex(keccak256(encodeAbiParameters(parseAbiParameters('uint256'), [baseSlot])), 'bigint') +
        BigInt(arrayIndex * itemSize)
    ),
    { size: 32 }
  );
}

/**
 * https://ethereum.stackexchange.com/questions/107282/storage-and-memory-layout-of-strings
 * @param value string | bytes
 */
export function getBytesValue(value: string | Hex) {
  const bytesString = toBytes(value);
  if (bytesString.length > 31) throw new Error('Error: strings > 31 bytes are not implemented');
  return concat([toHex(pad(bytesString, { size: 31, dir: 'right' })), toHex(bytesString.length * 2, { size: 1 })]);
}
