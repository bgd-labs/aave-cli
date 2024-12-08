import {describe, expect, it} from 'vitest';
import {readJsonFile} from '../utils/json';
import {generateLiquidityMiningReport} from './lm-report';

describe('liquidity mining report', () => {
  it(
    'should generate a well formatted liquidity mining report',
    async () => {
      const snapshot = readJsonFile('/src/reports/mocks/liquidityMining.json');
      const content = await generateLiquidityMiningReport(snapshot);
      expect(content).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
