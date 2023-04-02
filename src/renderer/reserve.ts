import { fetchRateStrategyImage } from "../fetchIRStrategy";
import { AaveV3Reserve, CHAIN_ID } from "../types";

export const getBlockExplorerLink: {
  [key in CHAIN_ID]: (address: string) => string;
} = {
  [CHAIN_ID.MAINNET]: (address) =>
    `[${address}](https://etherscan.io/address/${address})`,
  [CHAIN_ID.OPTIMISM]: (address) =>
    `[${address}](https://optimistic.etherscan.io/address/${address})`,
  [CHAIN_ID.POLYGON]: (address) =>
    `[${address}](https://polygonscan.com/address/${address})`,
  [CHAIN_ID.FANTOM]: (address) =>
    `[${address}](https://ftmscan.com/address/${address})`,
  [CHAIN_ID.ARBITRUM]: (address) =>
    `[${address}](https://https://arbiscan.io/address/${address})`,
  [CHAIN_ID.AVALANCHE]: (address) =>
    `[${address}](https://snowtrace.io/address/${address})`,
};

export function renderValue<T extends keyof AaveV3Reserve>(
  key: T,
  reserve: AaveV3Reserve,
  chainId: CHAIN_ID
) {
  if (
    [
      "reserveFactor",
      "liquidationProtocolFee",
      "liquidationThreshold",
      "ltv",
    ].includes(key)
  )
    return `${(reserve[key] as number) / 100} %`;
  if (["supplyCap", "borrowCap"].includes(key))
    return `${reserve[key].toLocaleString("en-US")} ${reserve.symbol}`;
  if (key === "liquidationBonus")
    return `${((reserve[key] as number) - 10000) / 100} %`;
  if (key === "interestRateStrategy")
    return `![${getBlockExplorerLink[chainId](
      reserve[key] as string
    )}](/.assets/${chainId}_${reserve[key]}.svg)`;
  if (typeof reserve[key] === "number")
    return reserve[key].toLocaleString("en-US");
  if (typeof reserve[key] === "string" && /0x.+/.test(reserve[key] as string))
    return getBlockExplorerLink[chainId](reserve[key] as string);
  return reserve[key];
}

function renderReserveHeadline(reserve: AaveV3Reserve, chainId: CHAIN_ID) {
  return `#### ${reserve.symbol} (${getBlockExplorerLink[chainId](
    reserve.underlying
  )})\n\n`;
}

const ORDER: (keyof AaveV3Reserve)[] = ["supplyCap", "borrowCap"];
function sortReserveKeys(a: keyof AaveV3Reserve, b: keyof AaveV3Reserve) {
  const indexA = ORDER.indexOf(a);
  const indexB = ORDER.indexOf(b);
  if (indexA != -1 && indexB != -1) {
    if (indexA > indexB) {
      return 1;
    }
    if (indexB > indexA) {
      return -1;
    }
  }
  if (indexA != -1) return -1;
  if (indexB != -1) return -1;
  return a.localeCompare(b);
}

function renderReserveConfig(reserve: AaveV3Reserve, chainId: CHAIN_ID) {
  let content = "| description | value |\n| --- | --- |\n";
  const OMIT_KEYS: (keyof AaveV3Reserve)[] = [
    "underlying", // already rendered in the header
    "symbol", // already rendered in the header
  ];
  (Object.keys(reserve) as (keyof AaveV3Reserve)[])
    .filter((key) => !OMIT_KEYS.includes(key))
    .sort(sortReserveKeys)
    .map((key) => {
      content += `| ${key} | ${renderValue(key, reserve, chainId)} |\n`;
    });
  return content;
}

export type ReserveConfigDiff<A extends AaveV3Reserve = AaveV3Reserve> = {
  [key in keyof A]: A[key] & { from: A[key] | null; to: A[key] | null };
};

function renderReserveConfigDiff(
  reserve: ReserveConfigDiff,
  chainId: CHAIN_ID
) {
  let content =
    "| description | value before | value after |\n| --- | --- | --- |\n";
  (Object.keys(reserve) as (keyof AaveV3Reserve)[])
    .filter((key) => reserve[key].from)
    .sort(sortReserveKeys)
    .map((key) => {
      content += `| ${key} | ${renderValue(
        key,
        { ...reserve, [key]: reserve[key].from },
        chainId
      )} | ${renderValue(
        key,
        { ...reserve, [key]: reserve[key].to },
        chainId
      )} |\n`;
    });
  return content;
}

export function renderReserve(reserve: AaveV3Reserve, chainId: CHAIN_ID) {
  let content = renderReserveHeadline(reserve, chainId);
  content += renderReserveConfig(reserve, chainId);
  return content;
}

export function renderReserveDiff(diff: ReserveConfigDiff, chainId: CHAIN_ID) {
  let content = renderReserveHeadline(diff as AaveV3Reserve, chainId);
  content += renderReserveConfigDiff(diff, chainId);
  return content;
}
