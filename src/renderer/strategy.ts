import { AaveV3Strategy } from "../types";
import { formatUnits } from "viem";

export function renderStrategyValue<T extends keyof AaveV3Strategy>(
  key: T,
  reserve: AaveV3Strategy
) {
  return `${formatUnits(BigInt(reserve[key]), 25)} %`;
}

const ORDER: (keyof AaveV3Strategy)[] = [
  "optimalUsageRatio",
  "maxExcessUsageRatio",
  "baseVariableBorrowRate",
  "variableRateSlope1",
  "variableRateSlope2",
  "baseStableBorrowRate",
  "stableRateSlope1",
  "stableRateSlope2",
  "optimalStableToTotalDebtRatio",
  "maxExcessStableToTotalDebtRatio",
];
function sortStrategyKeys(a: keyof AaveV3Strategy, b: keyof AaveV3Strategy) {
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

const OMIT_KEYS: (keyof AaveV3Strategy)[] = [
  "address", // already rendered in the reserve
];

export function renderStrategy(strategy: AaveV3Strategy) {
  let content = "";
  (Object.keys(strategy) as (keyof AaveV3Strategy)[])
    .filter((key) => !OMIT_KEYS.includes(key))
    .sort(sortStrategyKeys)
    .map((key) => {
      content += `| ${key} | ${renderStrategyValue(key, strategy)} |\n`;
    });
  return content;
}

export type StrategyDiff<A extends AaveV3Strategy = AaveV3Strategy> = {
  [key in keyof AaveV3Strategy]: A[key] & {
    from: A[key] | null;
    to: A[key] | null;
  };
};

export function renderStrategyDiff(diff: StrategyDiff) {
  let content = "";

  (Object.keys(diff) as (keyof AaveV3Strategy)[])
    .filter((key) => !OMIT_KEYS.includes(key))
    .filter((key) => diff[key].hasOwnProperty("from"))
    .sort(sortStrategyKeys)
    .map((key) => {
      content += `| ${key} | ${renderStrategyValue(key, {
        ...diff,
        [key]: diff[key].from,
      })} | ${renderStrategyValue(key, { ...diff, [key]: diff[key].to })} |\n`;
    });

  return content;
}
