import { describe, it, expect } from "vitest";
import { diff } from "../utils/diff";
import { AaveV3Reserve } from "../types";
import { renderReserve, renderReserveDiff } from "./reserve";

const WBTC_MOCK = {
  isSiloed: false,
  debtCeiling: 0,
  isBorrowableInIsolation: false,
  aToken: "0x078f358208685046a11C85e8ad32895DED33A249",
  isActive: true,
  underlying: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f",
  stableDebtToken: "0x633b207Dd676331c413D4C013a6294B0FE47cD0e",
  liquidationBonus: 11000,
  variableDebtToken: "0x92b42c66840C7AD907b4BF74879FF3eF7c529473",
  eModeCategory: 0,
  variableDebtTokenImpl: "0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3",
  liquidationThreshold: 7500,
  isFrozen: false,
  stableBorrowRateEnabled: false,
  reserveFactor: 2000,
  borrowCap: 1115,
  supplyCap: 2100,
  symbol: "WBTC",
  isFlashloanable: false,
  interestRateStrategy: "0x9b34E3e183c9b0d1a08fF57a8fb59c821616295f",
  aTokenImpl: "0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B",
  ltv: 7000,
  borrowingEnabled: true,
  decimals: 8,
  usageAsCollateralEnabled: true,
  stableDebtTokenImpl: "0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e",
  oracleLatestAnswer: 2205356460000,
  oracle: "0x6ce185860a4963106506C203335A2910413708e9",
  liquidationProtocolFee: 1000,
};

describe("reserve", () => {
  it("should properly render new reserve", () => {
    const out = renderReserve(WBTC_MOCK, 1);
    expect(out).eq(
      `#### WBTC ([0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f](https://etherscan.io/address/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f))

| description | value |
| --- | --- |
| supplyCap | 2,100 WBTC |
| borrowCap | 1,115 WBTC |
| aToken | [0x078f358208685046a11C85e8ad32895DED33A249](https://etherscan.io/address/0x078f358208685046a11C85e8ad32895DED33A249) |
| aTokenImpl | [0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B](https://etherscan.io/address/0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B) |
| borrowingEnabled | true |
| debtCeiling | 0 |
| decimals | 8 |
| eModeCategory | 0 |
| interestRateStrategy | ![[0x9b34E3e183c9b0d1a08fF57a8fb59c821616295f](https://etherscan.io/address/0x9b34E3e183c9b0d1a08fF57a8fb59c821616295f)](/.assets/1_0x9b34E3e183c9b0d1a08fF57a8fb59c821616295f.svg) |
| isActive | true |
| isBorrowableInIsolation | false |
| isFlashloanable | false |
| isFrozen | false |
| isSiloed | false |
| liquidationBonus | 10 % |
| liquidationProtocolFee | 10 % |
| liquidationThreshold | 75 % |
| ltv | 70 % |
| oracle | [0x6ce185860a4963106506C203335A2910413708e9](https://etherscan.io/address/0x6ce185860a4963106506C203335A2910413708e9) |
| oracleLatestAnswer | 2,205,356,460,000 |
| reserveFactor | 20 % |
| stableBorrowRateEnabled | false |
| stableDebtToken | [0x633b207Dd676331c413D4C013a6294B0FE47cD0e](https://etherscan.io/address/0x633b207Dd676331c413D4C013a6294B0FE47cD0e) |
| stableDebtTokenImpl | [0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e](https://etherscan.io/address/0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e) |
| usageAsCollateralEnabled | true |
| variableDebtToken | [0x92b42c66840C7AD907b4BF74879FF3eF7c529473](https://etherscan.io/address/0x92b42c66840C7AD907b4BF74879FF3eF7c529473) |
| variableDebtTokenImpl | [0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3](https://etherscan.io/address/0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3) |
`
    );
  });
  it("should properly render altered reserve", () => {
    const input: AaveV3Reserve = { ...WBTC_MOCK, borrowCap: 100 };
    const out = diff(WBTC_MOCK, { ...input });

    expect(renderReserveDiff(out as any, 1))
      .eq(`#### WBTC ([0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f](https://etherscan.io/address/0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f))

| description | value before | value after |
| --- | --- | --- |
| borrowCap | 1,115 WBTC | 100 WBTC |
`);
  });
});
