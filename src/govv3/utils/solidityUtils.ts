import { Address, getAddress } from 'viem';
import { TenderlySimulationResponse } from '../../utils/tenderlyClient';
import { isKnownAddress } from './checkAddress';
import { flagKnownAddress } from './markdownUtils';

// --- Helper methods ---
/**
 * @notice Given a Tenderly contract object, generates a descriptive human-friendly name for that contract
 * @param contract Tenderly contract object to generate name from
 */
export function getContractName(
  contracts: TenderlySimulationResponse['contracts'] = [],
  address: Address,
  chainId: number
): string {
  const isAddrKnown = isKnownAddress(address, chainId);

  // lower-case comparison as strict equality would fail on child contracts which are lower-cased when returned from tenderly
  const contract = contracts.find((c) => c.address.toLowerCase() === address.toLowerCase());
  if (!contract) return `unknown contract name at \`${getAddress(address)}\`${flagKnownAddress(isAddrKnown)}`;
  let contractName = contract?.contract_name;

  // If the contract is a token, include the full token name. This is useful in cases where the
  // token is a proxy, so the contract name doesn't give much useful information
  if (contract?.token_data?.name) contractName += ` (${contract?.token_data?.name})`;

  // if the contract is a proxy include it's child
  if (contract.standards?.includes('eip1967') && contract.child_contracts?.[0].address) {
    return `${contractName} at \`${getAddress(address)}\`${flagKnownAddress(
      isAddrKnown
    )} with implementation ${getContractName(contracts, contract.child_contracts?.[0].address, chainId)}`;
  }

  // Lastly, append the contract address and save it off
  return `${contractName} at \`${getAddress(address)}\`${flagKnownAddress(isAddrKnown)}`;
}
