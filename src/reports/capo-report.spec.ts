import {describe, expect, it} from 'vitest';
import {readJsonFile} from '../utils/json';
import {generateCapoReport} from './capo-report';

describe.only('capo report', () => {
  it(
    'should generate a well formatted capo report',
    async () => {
      const snapshot = readJsonFile('/src/reports/mocks/capo.json');
      const content = await generateCapoReport(snapshot);
      console.log(content);
      expect(content).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
