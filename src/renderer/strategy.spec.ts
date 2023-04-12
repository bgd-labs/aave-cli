import { describe, it, expect } from "vitest";
import { diff } from "../utils/diff";
import { AaveV3Reserve } from "../types";
import { renderReserve, renderReserveDiff } from "./reserve";
import { renderStrategy, renderStrategyDiff } from "./strategy";

const STRATEGY_1 = {
  address: "0xfab05a6aF585da2F96e21452F91E812452996BD3",
  baseStableBorrowRate: "50000000000000000000000000",
  baseVariableBorrowRate: "10000000000000000000000000",
  maxExcessStableToTotalDebtRatio: "800000000000000000000000000",
  maxExcessUsageRatio: "200000000000000000000000000",
  optimalStableToTotalDebtRatio: "200000000000000000000000000",
  optimalUsageRatio: "800000000000000000000000000",
  stableRateSlope1: "5000000000000000000000000",
  stableRateSlope2: "750000000000000000000000000",
  variableRateSlope1: "40000000000000000000000000",
  variableRateSlope2: "750000000000000000000000000",
};

const STRATEGY_2 = {
  address: "0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82",
  baseStableBorrowRate: "50000000000000000000000000",
  baseVariableBorrowRate: "0",
  maxExcessStableToTotalDebtRatio: "800000000000000000000000000",
  maxExcessUsageRatio: "100000000000000000000000000",
  optimalStableToTotalDebtRatio: "200000000000000000000000000",
  optimalUsageRatio: "900000000000000000000000000",
  stableRateSlope1: "5000000000000000000000000",
  stableRateSlope2: "600000000000000000000000000",
  variableRateSlope1: "40000000000000000000000000",
  variableRateSlope2: "600000000000000000000000000",
};

describe("strategy", () => {
  it("should properly render new strategy", () => {
    const out = renderStrategy(STRATEGY_1);
    expect(out).eq(`| optimalUsageRatio | 80 % |
| maxExcessUsageRatio | 20 % |
| baseVariableBorrowRate | 1 % |
| variableRateSlope1 | 4 % |
| variableRateSlope2 | 75 % |
| baseStableBorrowRate | 5 % |
| stableRateSlope1 | 0.5 % |
| stableRateSlope2 | 75 % |
| optimalStableToTotalDebtRatio | 20 % |
| maxExcessStableToTotalDebtRatio | 80 % |
`);
  });

  it("should properly render strategy diff", () => {
    const result = diff(STRATEGY_1, STRATEGY_2);
    expect(renderStrategyDiff(result as any))
      .eq(`| optimalUsageRatio | 80 % | 90 % |
| maxExcessUsageRatio | 20 % | 10 % |
| baseVariableBorrowRate | 1 % | 0 % |
| variableRateSlope2 | 75 % | 60 % |
| stableRateSlope2 | 75 % | 60 % |
`);
  });
});
