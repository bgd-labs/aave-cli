import { AaveSafetyModule, AaveV3Ethereum, GovernanceV3Ethereum } from '@bgd-labs/aave-address-book';
import { Chain, Client, GetBlockReturnType, Hex, fromRlp, toHex, toRlp } from 'viem';
import { getBlock, getProof as viemGetProof } from 'viem/actions';

/**
 * Slots that represent configuration values relevant for all accounts
 */
export const WAREHOUSE_SLOTS = {
  [AaveSafetyModule.STK_AAVE]: {
    exchangeRate: 81n, // exchangeRate
  },
} as const;

/**
 * Slots that represent the balance of a single account
 */
export const VOTING_SLOTS = {
  [AaveSafetyModule.STK_AAVE]: { balance: 0n }, // balance
  [AaveV3Ethereum.ASSETS.AAVE.A_TOKEN]: {
    balance: 52n, // balance
    delegation: 64n,
  }, // delegation
  [AaveV3Ethereum.ASSETS.AAVE.UNDERLYING]: { balance: 0n }, // balance
  [GovernanceV3Ethereum.GOVERNANCE]: { representative: 9n }, // representative
} as const;

export async function getProof(client: Client, address: Hex, slots: readonly Hex[], blockHash: Hex) {
  const block = await getBlock(client, { blockHash });
  return viemGetProof(client, {
    address,
    storageKeys: slots.map((slot) => slot),
    blockNumber: block.number,
  });
}

// IMPORTANT valid only for post-Shapella blocks, as it includes `withdrawalsRoot`
export const getBlockRLP = (rawBlock: GetBlockReturnType<Chain | undefined, false, 'latest'>): Hex => {
  const rawData: Hex[] = [
    rawBlock.parentHash,
    rawBlock.sha3Uncles,
    rawBlock.miner,
    rawBlock.stateRoot,
    rawBlock.transactionsRoot,
    rawBlock.receiptsRoot,
    rawBlock.logsBloom!,
    '0x0', //toHex(rawBlock.difficulty),
    toHex(rawBlock.number || 0), // 0 to account for type null
    toHex(rawBlock.gasLimit),
    toHex(rawBlock.gasUsed),
    toHex(rawBlock.timestamp),
    rawBlock.extraData,
    rawBlock.mixHash,
    rawBlock.nonce!,
    toHex(rawBlock.baseFeePerGas || 0), // 0 to account for type null
    // @ts-ignore looks like this field is not yet added into the type
    rawBlock.withdrawalsRoot!,
  ];
  return toRlp(rawData);
};

export const getAccountRPL = (proof: Hex[]) => {
  return toRlp(proof.map((rpl) => fromRlp(rpl, 'hex')));
};
