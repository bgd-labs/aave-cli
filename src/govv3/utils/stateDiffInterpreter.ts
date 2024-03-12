import { Client, Hex, formatUnits, getContract } from 'viem';
import { tenderlyDeepDiff } from './tenderlyDeepDiff';
import * as pools from '@bgd-labs/aave-address-book';
import { getBits } from '../../utils/storageSlots';
import { formatNumberString } from './markdownUtils';
import { findAsset } from './checkAddress';

export async function interpretStateChange(
  contractAddress: Hex,
  name: string = '',
  original: Record<string, any>,
  dirty: Record<string, any>,
  key: Hex,
  client: Client
) {
  if (name === '_reserves' && (original.configuration.data || dirty.configuration.data))
    return await reserveConfigurationChanged(contractAddress, original, dirty, key, client);
  if (
    name === '_balances' ||
    name === 'balanceOf' ||
    name === 'balances' ||
    name === 'allowed' ||
    name == '_allowances'
  )
    return numberValueChanged(contractAddress, name, original, dirty, key, client);
  return tenderlyDeepDiff(original, dirty, `\`${name}\` key \`${key}\``);
}

async function numberValueChanged(
  contractAddress: Hex,
  name: string = '',
  original: Record<string, any> | string,
  dirty: Record<string, any> | string,
  key: Hex,
  client: Client
) {
  const asset = await findAsset(client, contractAddress);
  if (typeof original !== 'string') return undefined;
  return tenderlyDeepDiff(
    formatNumberString(formatUnits(BigInt(original as string), asset.decimals)),
    formatNumberString(formatUnits(BigInt(dirty as string), asset.decimals)),
    `\`${name}\` key \`${key}\``
  );
}

async function reserveConfigurationChanged(
  contractAddress: Hex,
  original: Record<string, any>,
  dirty: Record<string, any>,
  key: Hex,
  client: Client
) {
  const configurationBefore = getDecodedReserveData(contractAddress, original.configuration.data);
  const configurationAfter = getDecodedReserveData(contractAddress, dirty.configuration.data);
  const asset = await findAsset(client, key);
  return `# decoded configuration.data for key \`${key}\` (symbol: ${asset.symbol})
  ${tenderlyDeepDiff(configurationBefore, configurationAfter, 'configuration.data')}`;
}

function getDecodedReserveData(contractAddress: string, data?: bigint) {
  if (!data) return {};
  if (
    [pools.AaveV2EthereumAMM.POOL, pools.AaveV2Ethereum.POOL, pools.AaveV2Polygon.POOL, pools.AaveV2Avalanche.POOL]
      .map((address) => address.toLowerCase())
      .includes(contractAddress.toLowerCase())
  )
    return decodeReserveDataV2(data);
  return decodeReserveDataV3(data);
}

function decodeReserveDataV2(data: bigint) {
  const ltv = getBits(data, 0n, 15n);
  const liquidationThreshold = getBits(data, 16n, 31n);
  const liquidationBonus = getBits(data, 32n, 47n);
  const decimals = getBits(data, 48n, 55n);
  const active = Number(getBits(data, 56n, 56n));
  const frozen = Number(getBits(data, 57n, 57n));
  const borrowingEnabled = Number(getBits(data, 58n, 58n));
  const stableBorrowingEnabled = Number(getBits(data, 59n, 59n));
  const reserveFactor = getBits(data, 64n, 79n);
  return {
    ltv,
    liquidationThreshold,
    liquidationBonus,
    decimals,
    active: !!active,
    frozen: !!frozen,
    borrowingEnabled: !!borrowingEnabled,
    stableBorrowingEnabled: !!stableBorrowingEnabled,
    reserveFactor,
  };
}

function decodeReserveDataV3(data: bigint) {
  const ltv = getBits(data, 0n, 15n);
  const liquidationThreshold = getBits(data, 16n, 31n);
  const liquidationBonus = getBits(data, 32n, 47n);
  const decimals = getBits(data, 48n, 55n);
  const active = Number(getBits(data, 56n, 56n));
  const frozen = Number(getBits(data, 57n, 57n));
  const borrowingEnabled = Number(getBits(data, 58n, 58n));
  const stableRateBorrowingEnabled = Number(getBits(data, 59n, 59n));
  const paused = Number(getBits(data, 60n, 60n));
  const borrowingInIsolation = Number(getBits(data, 61n, 61n));
  const siloedBorrowingEnabled = Number(getBits(data, 62n, 62n));
  const flashloaningEnabled = Number(getBits(data, 63n, 63n));
  const reserveFactor = getBits(data, 64n, 79n);
  const borrowCap = getBits(data, 80n, 115n);
  const supplyCap = getBits(data, 116n, 151n);
  const liquidationProtocolFee = getBits(data, 152n, 167n);
  const eModeCategory = getBits(data, 168n, 175n);
  const unbackedMintCap = getBits(data, 176n, 211n);
  const debtCeiling = getBits(data, 212n, 251n);

  return {
    ltv,
    liquidationThreshold,
    liquidationBonus,
    decimals,
    active: !!active,
    frozen: !!frozen,
    borrowingEnabled: !!borrowingEnabled,
    stableRateBorrowingEnabled,
    paused,
    borrowingInIsolation,
    reserveFactor,
    borrowCap,
    supplyCap,
    liquidationProtocolFee,
    eModeCategory,
    unbackedMintCap,
    debtCeiling,
    siloedBorrowingEnabled: !!siloedBorrowingEnabled,
    flashloaningEnabled: !!flashloaningEnabled,
  };
}
