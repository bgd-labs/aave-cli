import { getAddress } from 'viem';
import { TenderlySimulationResponse } from '../../../utils/tenderlyClient';

/**
 * Returns the selected bits of a uint256
 * @param _bigIntValue
 * @param startBit
 * @param endBit
 * @returns
 */
export function getBits(_bigIntValue: bigint | number | string, startBit: bigint, endBit: bigint) {
  const bigIntValue = BigInt(_bigIntValue);
  if (startBit > endBit) {
    throw new Error('Invalid bit range: startBit must be less than or equal to endBit');
  }

  const bitLength = BigInt(bigIntValue.toString(2)).toString().length;
  if (endBit >= bitLength) {
    endBit = BigInt(bitLength - 1);
  }

  const mask = (1n << (endBit - startBit + 1n)) - 1n;
  const maskedValue = (bigIntValue >> startBit) & mask;
  return maskedValue.toString();
}

// --- Helper methods ---
/**
 * @notice Given a Tenderly contract object, generates a descriptive human-friendly name for that contract
 * @param contract Tenderly contract object to generate name from
 */
export function getContractName(contracts: TenderlySimulationResponse['contracts'] = [], address: string): string {
  // lower-case comparison as strict equality would fail on child contracts which are lower-cased when returned from tenderly
  const contract = contracts.find((c) => c.address.toLowerCase() === address.toLowerCase());
  if (!contract) return `unknown contract name at \`${getAddress(address)}\``;
  let contractName = contract?.contract_name;

  // If the contract is a token, include the full token name. This is useful in cases where the
  // token is a proxy, so the contract name doesn't give much useful information
  if (contract?.token_data?.name) contractName += ` (${contract?.token_data?.name})`;

  // if the contract is a proxy include it's child
  if (contract.standards?.includes('eip1967') && contract.child_contracts?.[0].address) {
    return `${contractName} at \`${getAddress(contract.address)}\` with implementation ${getContractName(
      contracts,
      contract.child_contracts?.[0].address
    )}`;
  }

  // Lastly, append the contract address and save it off
  return `${contractName} at \`${getAddress(contract.address)}\``;
}