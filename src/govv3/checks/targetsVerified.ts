// Based on https://github.com/Uniswap/governance-seatbelt/blob/main/checks/check-targets-verified-etherscan.ts
// adjusted for viem & aave governance v3
import { Client, Hex } from 'viem';
import { ProposalCheck } from './types';
import { TenderlySimulationResponse, tenderly } from '../../utils/tenderlyClient';
import { PayloadsController } from '../payloadsController';
import { isKnownAddress } from '../utils/checkAddress';
import { flagKnownAddress } from '../utils/markdownUtils';
import { getBytecode } from 'viem/actions';

/**
 * Check all targets with code are verified on Etherscan
 */
export const checkTargetsVerifiedEtherscan: ProposalCheck<Awaited<ReturnType<PayloadsController['getPayload']>>> = {
  name: 'Check all targets are verified on Etherscan',
  async checkProposal(proposal, sim, client) {
    const allTargets = proposal.payload.actions.map((action) => action.target);
    const uniqueTargets = allTargets.filter((addr, i, targets) => targets.indexOf(addr) === i);
    const info = await checkVerificationStatuses(sim, uniqueTargets, client);
    return { info, warnings: [], errors: [] };
  },
};

/**
 * Check all touched contracts with code are verified on Etherscan
 */
export const checkTouchedContractsVerifiedEtherscan: ProposalCheck<any> = {
  name: 'Check all touched contracts are verified on Etherscan',
  async checkProposal(proposal, sim, client) {
    const info = await checkVerificationStatuses(sim, sim.transaction.addresses, client);
    return { info, warnings: [], errors: [] };
  },
};

/**
 * For a given simulation response, check verification status of a set of addresses
 */
async function checkVerificationStatuses(
  sim: TenderlySimulationResponse,
  addresses: Hex[],
  client: Client
): Promise<string[]> {
  let info: string[] = []; // prepare output
  for (const addr of addresses) {
    const isAddrKnown = isKnownAddress(addr, client.chain!.id);
    const status = await checkVerificationStatus(sim, addr, client);
    if (status === 'eoa') {
      info.push(`- ${addr}: EOA (verification not applicable)`);
    } else if (status === 'verified') {
      const contract = getContract(sim, addr);
      info.push(`- ${addr}: Contract (verified) (${contract?.contract_name}) ${flagKnownAddress(isAddrKnown)}`);
    } else {
      info.push(`- ${addr}: Contract (not verified) ${flagKnownAddress(isAddrKnown)}`);
    }
  }
  return info;
}

/**
 * For a given address, check if it's an EOA, a verified contract, or an unverified contract
 */
async function checkVerificationStatus(
  sim: TenderlySimulationResponse,
  addr: Hex,
  client: Client
): Promise<'verified' | 'eoa' | 'unverified'> {
  // If an address exists in the contracts array, it's verified on Etherscan
  const contract = getContract(sim, addr);
  if (contract) return 'verified';
  const stateDiff = getStateDiff(sim, addr);
  if (stateDiff) return 'unverified';
  // Otherwise, check if there's code at the address. Addresses with code not in the contracts array are not verified
  const code = await getBytecode(client, { address: addr });
  return code === undefined ? 'eoa' : 'unverified';
}

function getContract(sim: TenderlySimulationResponse, addr: string) {
  return sim.contracts.find((item) => item.address === addr);
}

function getStateDiff(sim: TenderlySimulationResponse, addr: string) {
  return sim.transaction.transaction_info.state_diff?.find(
    (diff) => diff.raw?.[0]?.address.toLowerCase() === addr.toLowerCase()
  );
}
