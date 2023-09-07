import { AaveSafetyModule, AaveV3Ethereum } from '@bgd-labs/aave-address-book';
import { Block, Hex, PublicClient, toHex, toRlp } from 'viem';

const WAREHOUSE_SLOTS = {
  [AaveSafetyModule.STK_AAVE]: [
    81, // exchangeRate
  ],
};

export const VOTING_SLOTS = {
  [AaveSafetyModule.STK_AAVE]: [
    0, // balance
  ],
  [AaveV3Ethereum.ASSETS.AAVE.A_TOKEN]: [
    52, // balance
    64, // delegation
  ],
  [AaveV3Ethereum.ASSETS.AAVE.UNDERLYING]: [
    0, // balance
  ],
} as const;

export async function getProof(publicClient: PublicClient, address: Hex, slots: readonly Hex[], blockHash: Hex) {
  const block = await publicClient.getBlock({ blockHash });
  return publicClient.request({ method: 'eth_getProof' as any, params: [address, slots, toHex(block.number)] as any });
}

// IMPORTANT valid only for post-Shapella blocks, as it includes `withdrawalsRoot`
const prepareBLockRLP = (rawBlock: Block): Hex => {
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
