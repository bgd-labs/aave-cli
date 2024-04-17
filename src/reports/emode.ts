import { formatUnits } from "viem";
import type { AaveV3Emode } from "./snapshot-types";

export function renderEModeValue<T extends keyof AaveV3Emode>(key: T, emode: AaveV3Emode) {
  if (!emode[key]) return "-";
  if (["reserveFactor", "liquidationProtocolFee", "liquidationThreshold", "ltv"].includes(key))
    return `${formatUnits(BigInt(emode[key]), 2)} %`;
  if (key === "liquidationBonus") return emode[key] === 0 ? "0 %" : `${((emode[key] as number) - 10000) / 100} %`;
  return emode[key];
}

const ORDER: (keyof AaveV3Emode)[] = [
  "eModeCategory",
  "label",
  "ltv",
  "liquidationThreshold",
  "liquidationBonus",
  "priceSource",
];
function sortEmodeKeys(a: keyof AaveV3Emode, b: keyof AaveV3Emode) {
  const indexA = ORDER.indexOf(a);
  const indexB = ORDER.indexOf(b);
  if (indexA !== -1 && indexB !== -1) {
    if (indexA > indexB) {
      return 1;
    }
    if (indexB > indexA) {
      return -1;
    }
  }
  if (indexA !== -1) return -1;
  if (indexB !== -1) return -1;
  return a.localeCompare(b);
}

const OMIT_KEYS: (keyof AaveV3Emode)[] = ["eModeCategory"];

export function renderEmode(strategy: AaveV3Emode) {
  let content = "";
  (Object.keys(strategy) as (keyof AaveV3Emode)[])
    .filter((key) => !OMIT_KEYS.includes(key))
    .sort(sortEmodeKeys)
    .map((key) => {
      content += `| eMode.${key} | ${renderEModeValue(key, strategy)} |\n`;
    });
  return content;
}

export type EmodeDiff<A extends AaveV3Emode = AaveV3Emode> = {
  [key in keyof AaveV3Emode]: A[key] & {
    from: A[key] | null;
    to: A[key] | null;
  };
};

export function renderEmodeDiff(diff: EmodeDiff) {
  let content = "";

  (Object.keys(diff) as (keyof AaveV3Emode)[])
    .filter((key) => !OMIT_KEYS.includes(key))
    .filter((key) => diff[key].hasOwn("from"))
    .sort(sortEmodeKeys)
    .map((key) => {
      content += `| eMode.${key} | ${renderEModeValue(key, {
        ...diff,
        [key]: diff[key].from,
      })} | ${renderEModeValue(key, { ...diff, [key]: diff[key].to })} |\n`;
    });

  return content;
}
