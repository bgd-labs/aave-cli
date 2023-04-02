## Reserves

### Reserves added

| key                      | value                                      |
| ------------------------ | ------------------------------------------ |
| isBorrowableInIsolation  | true                                       |
| borrowCap                | 0                                          |
| liquidationBonus         | 10500                                      |
| underlying               | 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1 |
| isFrozen                 | false                                      |
| stableDebtToken          | 0xd94112B5B62d53C9402e7A60289c6810dEF1dC9B |
| variableDebtToken        | 0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC |
| reserveFactor            | 1000                                       |
| liquidationProtocolFee   | 1000                                       |
| usageAsCollateralEnabled | true                                       |
| ltv                      | 7500                                       |
| supplyCap                | 2000000000                                 |
| debtCeiling              | 0                                          |
| borrowingEnabled         | true                                       |
| isActive                 | true                                       |
| eModeCategory            | 1                                          |
| symbol                   | DAI                                        |
| stableBorrowRateEnabled  | true                                       |
| isFlashloanable          | false                                      |
| aToken                   | 0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE |
| liquidationThreshold     | 8000                                       |
| aTokenImpl               | 0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B |
| stableDebtTokenImpl      | 0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e |
| interestRateStrategy     | 0xA9F3C3caE095527061e6d270DBE163693e6fda9D |
| variableDebtTokenImpl    | 0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3 |
| oracle                   | [object Object]                            |
| decimals                 | 18                                         |
| isSiloed                 | false                                      |

### Raw diff

```json
{
  "reserves": {
    "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1": {
      "from": {
        "isBorrowableInIsolation": true,
        "borrowCap": 0,
        "liquidationBonus": 10500,
        "underlying": "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
        "isFrozen": false,
        "stableDebtToken": "0xd94112B5B62d53C9402e7A60289c6810dEF1dC9B",
        "variableDebtToken": "0x8619d80FB0141ba7F184CbF22fd724116D9f7ffC",
        "reserveFactor": 1000,
        "liquidationProtocolFee": 1000,
        "usageAsCollateralEnabled": true,
        "ltv": 7500,
        "supplyCap": 2000000000,
        "debtCeiling": 0,
        "borrowingEnabled": true,
        "isActive": true,
        "eModeCategory": 1,
        "symbol": "DAI",
        "stableBorrowRateEnabled": true,
        "isFlashloanable": false,
        "aToken": "0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE",
        "liquidationThreshold": 8000,
        "aTokenImpl": "0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B",
        "stableDebtTokenImpl": "0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e",
        "interestRateStrategy": "0xA9F3C3caE095527061e6d270DBE163693e6fda9D",
        "variableDebtTokenImpl": "0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3",
        "oracle": {
          "latestAnswer": 99992560,
          "address": "0xc5C8E77B397E531B8EC06BFb0048328B30E9eCfB"
        },
        "decimals": 18,
        "isSiloed": false
      }
    }
  },
  "strategies": {
    "0x27eFE5db315b71753b2a38ED3d5dd7E9362ba93F": {
      "from": null,
      "to": {
        "baseStableBorrowRate": "68000000000000000000000000",
        "maxExcessStableToTotalDebtRatio": "800000000000000000000000000",
        "address": "0x27eFE5db315b71753b2a38ED3d5dd7E9362ba93F",
        "baseVariableBorrowRate": "10000000000000000000000000",
        "stableRateSlope2": "800000000000000000000000000",
        "optimalUsageRatio": "800000000000000000000000000",
        "variableRateSlope2": 100000000,
        "optimalStableToTotalDebtRatio": "200000000000000000000000000",
        "maxExcessUsageRatio": "200000000000000000000000000",
        "stableRateSlope1": "40000000000000000000000000",
        "variableRateSlope1": "38000000000000000000000000"
      }
    }
  }
}
```
