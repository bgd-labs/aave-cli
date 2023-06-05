import { describe, it, expect } from 'vitest';
import { diffReports } from './diff-reports';
import { readJsonFile } from '../utils/json';

describe('report', () => {
  it('should generate a well formatted report', async () => {
    const from = readJsonFile('/src/mocks/preTestEngineArbV3.json');
    const to = readJsonFile('/src/mocks/postTestEngineArbV3.json');
    const content = await diffReports(from, to);
    console.log(content);
    expect(content).toMatchSnapshot();
  });
});
