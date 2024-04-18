import {describe, expect, it} from 'vitest';
import {diff} from './diff';
import {renderEmode, renderEmodeDiff} from './emode';
import {fetchRateStrategyImage} from './fetch-IR-strategy';

const EMODE_1 = {
  eModeCategory: 1,
  label: 'Stablecoins',
  liquidationBonus: 10100,
  liquidationThreshold: 9750,
  ltv: 9700,
  priceSource: '0x0000000000000000000000000000000000000000',
};

const EMODE_2 = {
  eModeCategory: 2,
  label: 'Stablecoins (altered)',
  liquidationBonus: 1000,
  liquidationThreshold: 500,
  ltv: 250,
  priceSource: '0x0000000000000000000000000000000000000000',
};

describe('eMode', () => {
  it('should properly render new strategy', () => {
    const out = renderEmode(EMODE_1);
    expect(out).eq(`| eMode.label | Stablecoins |
| eMode.ltv | 97 % |
| eMode.liquidationThreshold | 97.5 % |
| eMode.liquidationBonus | 1 % |
| eMode.priceSource | 0x0000000000000000000000000000000000000000 |
`);
  });

  it('should properly render strategy diff', () => {
    const result = diff(EMODE_1, EMODE_2);
    expect(renderEmodeDiff(result as any)).eq(`| eMode.label | Stablecoins | Stablecoins (altered) |
| eMode.ltv | 97 % | 2.5 % |
| eMode.liquidationThreshold | 97.5 % | 5 % |
| eMode.liquidationBonus | 1 % | -90 % |
`);
  });
});
