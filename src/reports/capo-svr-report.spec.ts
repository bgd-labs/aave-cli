import {describe, expect, it} from 'vitest';
import {readJsonFile} from '../utils/json';
import {generateSvrCapoReport} from './capo-svr-comparative-report';

describe('capo svr report', () => {
  it('should generate a well formatted capo svr report', {timeout: 30000}, async () => {
    const snapshot = readJsonFile('/src/reports/mocks/capoSvr.json');
    const content = await generateSvrCapoReport(snapshot);
    console.log(content);
    expect(content).toMatchSnapshot();
  });
});
