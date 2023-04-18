## Reserve changes

### Reserves added

#### MOCK ([0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E](https://snowtrace.io/address/0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E))

| description                     | value                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| supplyCap                       | 4,000,000,000 MOCK                                                                                                    |
| borrowCap                       | 0 MOCK                                                                                                                |
| aToken                          | [0x625E7708f30cA75bfd92586e17077590C60eb4cD](https://snowtrace.io/address/0x625E7708f30cA75bfd92586e17077590C60eb4cD) |
| aTokenImpl                      | [0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B](https://snowtrace.io/address/0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B) |
| borrowingEnabled                | true                                                                                                                  |
| debtCeiling                     | 0                                                                                                                     |
| decimals                        | 6                                                                                                                     |
| eModeCategory                   | 1                                                                                                                     |
| interestRateStrategy            | [0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82](https://snowtrace.io/address/0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82) |
| isActive                        | true                                                                                                                  |
| isBorrowableInIsolation         | true                                                                                                                  |
| isFlashloanable                 | false                                                                                                                 |
| isFrozen                        | false                                                                                                                 |
| isSiloed                        | false                                                                                                                 |
| liquidationBonus                | 4 %                                                                                                                   |
| liquidationProtocolFee          | 10 %                                                                                                                  |
| liquidationThreshold            | 86.25 %                                                                                                               |
| ltv                             | 82.5 %                                                                                                                |
| oracle                          | [0xF096872672F44d6EBA71458D74fe67F9a77a23B9](https://snowtrace.io/address/0xF096872672F44d6EBA71458D74fe67F9a77a23B9) |
| oracleLatestAnswer              | 100,000,000                                                                                                           |
| reserveFactor                   | 10 %                                                                                                                  |
| stableBorrowRateEnabled         | true                                                                                                                  |
| stableDebtToken                 | [0x307ffe186F84a3bc2613D1eA417A5737D69A7007](https://snowtrace.io/address/0x307ffe186F84a3bc2613D1eA417A5737D69A7007) |
| stableDebtTokenImpl             | [0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e](https://snowtrace.io/address/0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e) |
| usageAsCollateralEnabled        | true                                                                                                                  |
| variableDebtToken               | [0xFCCf3cAbbe80101232d343252614b6A3eE81C989](https://snowtrace.io/address/0xFCCf3cAbbe80101232d343252614b6A3eE81C989) |
| variableDebtTokenImpl           | [0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3](https://snowtrace.io/address/0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3) |
| optimalUsageRatio               | 90 %                                                                                                                  |
| maxExcessUsageRatio             | 10 %                                                                                                                  |
| baseVariableBorrowRate          | 0 %                                                                                                                   |
| variableRateSlope1              | 4 %                                                                                                                   |
| variableRateSlope2              | 60 %                                                                                                                  |
| baseStableBorrowRate            | 5 %                                                                                                                   |
| stableRateSlope1                | 0.5 %                                                                                                                 |
| stableRateSlope2                | 60 %                                                                                                                  |
| optimalStableToTotalDebtRatio   | 20 %                                                                                                                  |
| maxExcessStableToTotalDebtRatio | 80 %                                                                                                                  |

![ir](/.assets/24aea288aafbdead424aa0c4d79f42141f457a50.svg)

### Reserve altered

#### WETH.e ([0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB](https://snowtrace.io/address/0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB))

| description            | value before                                                                                                          | value after                                                                                                           |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| interestRateStrategy   | [0x79a906e8c998d2fb5C5D66d23c4c5416Fe0168D6](https://snowtrace.io/address/0x79a906e8c998d2fb5C5D66d23c4c5416Fe0168D6) | [0xc76EF342898f1AE7E6C4632627Df683FAD8563DD](https://snowtrace.io/address/0xc76EF342898f1AE7E6C4632627Df683FAD8563DD) |
| reserveFactor          | 10 %                                                                                                                  | 15 %                                                                                                                  |
| optimalUsageRatio      | 45 %                                                                                                                  | 80 %                                                                                                                  |
| maxExcessUsageRatio    | 55 %                                                                                                                  | 20 %                                                                                                                  |
| baseVariableBorrowRate | 0 %                                                                                                                   | 1 %                                                                                                                   |
| variableRateSlope1     | 7 %                                                                                                                   | 3.8 %                                                                                                                 |
| variableRateSlope2     | 300 %                                                                                                                 | 80 %                                                                                                                  |
| baseStableBorrowRate   | 9 %                                                                                                                   | 6.8 %                                                                                                                 |
| stableRateSlope1       | 0 %                                                                                                                   | 4 %                                                                                                                   |
| stableRateSlope2       | 0 %                                                                                                                   | 80 %                                                                                                                  |

#### MAI ([0x5c49b268c9841AFF1Cc3B0a418ff5c3442eE3F3b](https://snowtrace.io/address/0x5c49b268c9841AFF1Cc3B0a418ff5c3442eE3F3b))

| description          | value before                                                                                                          | value after                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| interestRateStrategy | [0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82](https://snowtrace.io/address/0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82) | [0xfab05a6aF585da2F96e21452F91E812452996BD3](https://snowtrace.io/address/0xfab05a6aF585da2F96e21452F91E812452996BD3) |
| reserveFactor        | 10 %                                                                                                                  | 20 %                                                                                                                  |
| optimalUsageRatio    | 90 %                                                                                                                  | 80 %                                                                                                                  |
| maxExcessUsageRatio  | 10 %                                                                                                                  | 20 %                                                                                                                  |
| variableRateSlope2   | 60 %                                                                                                                  | 75 %                                                                                                                  |
| stableRateSlope2     | 60 %                                                                                                                  | 75 %                                                                                                                  |

#### USDt ([0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7](https://snowtrace.io/address/0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7))

| description          | value before                                                                                                          | value after                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| interestRateStrategy | [0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82](https://snowtrace.io/address/0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82) | [0xfab05a6aF585da2F96e21452F91E812452996BD3](https://snowtrace.io/address/0xfab05a6aF585da2F96e21452F91E812452996BD3) |
| optimalUsageRatio    | 90 %                                                                                                                  | 80 %                                                                                                                  |
| maxExcessUsageRatio  | 10 %                                                                                                                  | 20 %                                                                                                                  |
| variableRateSlope2   | 60 %                                                                                                                  | 75 %                                                                                                                  |
| stableRateSlope2     | 60 %                                                                                                                  | 75 %                                                                                                                  |

#### FRAX ([0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64](https://snowtrace.io/address/0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64))

| description          | value before                                                                                                          | value after                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| interestRateStrategy | [0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82](https://snowtrace.io/address/0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82) | [0xfab05a6aF585da2F96e21452F91E812452996BD3](https://snowtrace.io/address/0xfab05a6aF585da2F96e21452F91E812452996BD3) |
| optimalUsageRatio    | 90 %                                                                                                                  | 80 %                                                                                                                  |
| maxExcessUsageRatio  | 10 %                                                                                                                  | 20 %                                                                                                                  |
| variableRateSlope2   | 60 %                                                                                                                  | 75 %                                                                                                                  |
| stableRateSlope2     | 60 %                                                                                                                  | 75 %                                                                                                                  |

## Raw diff

```json
{
  "reserves": {
    "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB": {
      "interestRateStrategy": {
        "from": "0x79a906e8c998d2fb5C5D66d23c4c5416Fe0168D6",
        "to": "0xc76EF342898f1AE7E6C4632627Df683FAD8563DD"
      },
      "reserveFactor": {
        "from": 1000,
        "to": 1500
      }
    },
    "0x5c49b268c9841AFF1Cc3B0a418ff5c3442eE3F3b": {
      "interestRateStrategy": {
        "from": "0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82",
        "to": "0xfab05a6aF585da2F96e21452F91E812452996BD3"
      },
      "reserveFactor": {
        "from": 1000,
        "to": 2000
      }
    },
    "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7": {
      "interestRateStrategy": {
        "from": "0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82",
        "to": "0xfab05a6aF585da2F96e21452F91E812452996BD3"
      }
    },
    "0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64": {
      "interestRateStrategy": {
        "from": "0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82",
        "to": "0xfab05a6aF585da2F96e21452F91E812452996BD3"
      }
    },
    "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6A": {
      "from": null,
      "to": {
        "aToken": "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
        "aTokenImpl": "0xa5ba6E5EC19a1Bf23C857991c857dB62b2Aa187B",
        "borrowCap": 0,
        "borrowingEnabled": true,
        "debtCeiling": 0,
        "decimals": 6,
        "eModeCategory": 1,
        "interestRateStrategy": "0xf4a0039F2d4a2EaD5216AbB6Ae4C4C3AA2dB9b82",
        "isActive": true,
        "isBorrowableInIsolation": true,
        "isFlashloanable": false,
        "isFrozen": false,
        "isSiloed": false,
        "liquidationBonus": 10400,
        "liquidationProtocolFee": 1000,
        "liquidationThreshold": 8625,
        "ltv": 8250,
        "oracle": "0xF096872672F44d6EBA71458D74fe67F9a77a23B9",
        "oracleLatestAnswer": 100000000,
        "reserveFactor": 1000,
        "stableBorrowRateEnabled": true,
        "stableDebtToken": "0x307ffe186F84a3bc2613D1eA417A5737D69A7007",
        "stableDebtTokenImpl": "0x52A1CeB68Ee6b7B5D13E0376A1E0E4423A8cE26e",
        "supplyCap": 4000000000,
        "symbol": "MOCK",
        "underlying": "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
        "usageAsCollateralEnabled": true,
        "variableDebtToken": "0xFCCf3cAbbe80101232d343252614b6A3eE81C989",
        "variableDebtTokenImpl": "0x81387c40EB75acB02757C1Ae55D5936E78c9dEd3"
      }
    }
  },
  "strategies": {
    "0xc76EF342898f1AE7E6C4632627Df683FAD8563DD": {
      "from": null,
      "to": {
        "address": "0xc76EF342898f1AE7E6C4632627Df683FAD8563DD",
        "baseStableBorrowRate": "68000000000000000000000000",
        "baseVariableBorrowRate": "10000000000000000000000000",
        "maxExcessStableToTotalDebtRatio": "800000000000000000000000000",
        "maxExcessUsageRatio": "200000000000000000000000000",
        "optimalStableToTotalDebtRatio": "200000000000000000000000000",
        "optimalUsageRatio": "800000000000000000000000000",
        "stableRateSlope1": "40000000000000000000000000",
        "stableRateSlope2": "800000000000000000000000000",
        "variableRateSlope1": "38000000000000000000000000",
        "variableRateSlope2": "800000000000000000000000000"
      }
    }
  }
}
```
