import { describe, it, expect } from "vitest";
import { diff } from "../utils/diff";
import { AaveV3Reserve } from "../types";
import {
  renderReserve,
  renderReserveDiff,
  renderReserveValue,
} from "./reserve";

const WBTC_MOCK = {
  aToken: "0x078f358208685046a11C85e8ad32895DED33A249",
  aTokenImpl: "0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B",
  borrowCap: 1115,
  borrowingEnabled: true,
  debtCeiling: 100000,
  decimals: 8,
  eModeCategory: 0,
  interestRateStrategy: "0x9b34E3e183c9b0d1a08fF57a8fb59c821616295f",
  isActive: true,
  isBorrowableInIsolation: false,
  isFlashloanable: false,
  isFrozen: false,
  isSiloed: false,
  liquidationBonus: 11000,
  liquidationProtocolFee: 1000,
  liquidationThreshold: 7555,
  ltv: 7000,
  oracle: "0x6ce185860a4963106506C203335A2910413708e9",
  oracleDecimals: 8,
  oracleName: "BTC / USD",
  oracleDescription: "BTC / USD",
  oracleLatestAnswer: 2251904551524,
  reserveFactor: 2000,
  stableBorrowRateEnabled: false,
  stableDebtToken: "0x633b207Dd676331c413D4C013a6294B0FE47cD0e",
  stableDebtTokenImpl: "0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e",
  supplyCap: 2100,
  symbol: "WBTC",
  underlying: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  usageAsCollateralEnabled: true,
  variableDebtToken: "0x92b42c66840C7AD907b4BF74879FF3eF7c529473",
  variableDebtTokenImpl: "0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3",
};

describe("reserve", () => {
  describe("renderReserveValue", () => {
    it("reserveFactor", () => {
      expect(renderReserveValue("reserveFactor", WBTC_MOCK, 1)).toBe("20 %");
    });
    it("debtCeiling", () => {
      expect(renderReserveValue("debtCeiling", WBTC_MOCK, 1)).toBe("1000 $");
    });
    it("lt", () => {
      expect(renderReserveValue("liquidationThreshold", WBTC_MOCK, 1)).toBe(
        "75.55 %"
      );
    });
  });
  describe("renderReserve", () => {
    it("should properly render new reserve", () => {
      const out = renderReserve(WBTC_MOCK, 1);
      expect(out).toMatchSnapshot();
    });
    it("should properly render altered reserve", () => {
      const input: AaveV3Reserve = { ...WBTC_MOCK, borrowCap: 100 };
      const out = diff(WBTC_MOCK, { ...input });

      expect(renderReserveDiff(out as any, 1)).toMatchSnapshot();
    });
  });
});
