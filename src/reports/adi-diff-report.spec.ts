import {describe, expect, it} from 'vitest';
import {readJsonFile} from '../utils/json';
import {adiDiffReports} from './adi-diff-reports';

describe('adi report', () => {
  it(
    'should generate a well formatted adi report',
    async () => {
      const from = readJsonFile('/src/reports/mocks/preTestADI.json');
      const to = readJsonFile('/src/reports/mocks/postTestADI.json');
      const content = await adiDiffReports(from, to);
      expect(content).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
