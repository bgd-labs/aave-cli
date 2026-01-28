import {describe, expect, it} from 'vitest';
import {readJsonFile} from '../utils/json';
import {diffReports} from './diff-reports';

describe('report', () => {
  it('should generate a well formatted report', {timeout: 30000}, async () => {
    const from = readJsonFile('/src/reports/mocks/preTestEngineArbV3.json');
    const to = readJsonFile('/src/reports/mocks/postTestEngineArbV3.json');
    const content = await diffReports(from, to);
    expect(content).toMatchSnapshot();
  });
  it('should generate a well formatted report for 3.1', {timeout: 30000}, async () => {
    const from = readJsonFile('/src/reports/mocks/pregho.json');
    const to = readJsonFile('/src/reports/mocks/postgho.json');
    const content = await diffReports(from, to);
    expect(content).toMatchSnapshot();
  });
  it('should generate a well formatted report for 3.2', {timeout: 30000}, async () => {
    const from = readJsonFile('/src/reports/mocks/pre3-2.json');
    const to = readJsonFile('/src/reports/mocks/post3-2.json');
    const content = await diffReports(from, to);
    expect(content).toMatchSnapshot();
  });
});
