import { GovernanceV3Goerli } from '@bgd-labs/aave-address-book';
import { Block, Hex, PublicClient, fromRlp, toHex, toRlp } from 'viem';

// TODO remove once final
const AaveSafetyModule = { STK_AAVE: '0x1406A9Ea2B0ec8FD4bCa4F876DAae2a70a9856Ec' } as const;

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
  ['0xD1ff82609FB63A0eee6FE7D2896d80d29491cCCd' /*AaveV3Ethereum.ASSETS.AAVE.A_TOKEN*/]: {
    balance: 52n, // balance
    delegation: 64n,
  }, // delegation
  ['0xb6D88BfC5b145a558b279cf7692e6F02064889d0' /*AaveV3Ethereum.ASSETS.AAVE.UNDERLYING*/]: { balance: 0n }, // balance
  [GovernanceV3Goerli.GOVERNANCE]: { representative: 9n }, // representative
} as const;

export async function getProof(publicClient: PublicClient, address: Hex, slots: Hex[], blockHash: Hex) {
  const block = await publicClient.getBlock({ blockHash });
  return publicClient.getProof({
    address,
    storageKeys: slots,
    blockNumber: block.number,
  });
}

// IMPORTANT valid only for post-Shapella blocks, as it includes `withdrawalsRoot`
export const getBLockRLP = (rawBlock: Block): Hex => {
  const rawData = [
    rawBlock.parentHash,
    rawBlock.sha3Uncles,
    rawBlock.miner,
    rawBlock.stateRoot,
    rawBlock.transactionsRoot,
    rawBlock.receiptsRoot,
    rawBlock.logsBloom,
    '0x', //toHex(rawBlock.difficulty),
    toHex(rawBlock.number || 0), // 0 to account for type null
    toHex(rawBlock.gasLimit),
    toHex(rawBlock.gasUsed),
    toHex(rawBlock.timestamp),
    rawBlock.extraData,
    rawBlock.mixHash,
    rawBlock.nonce,
    toHex(rawBlock.baseFeePerGas || 0), // 0 to account for type null
    // @ts-ignore looks like this field is not yet added into the type
    rawBlock.withdrawalsRoot,
  ];
  return toRlp(rawData);
};

export const getAccountRPL = (proof: Hex[]) => {
  return toRlp(proof.map((rpl) => fromRlp(rpl, 'hex')));
};
