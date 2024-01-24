import { MOCK_PAYLOAD } from './mocks/payload';
import { describe, it, expect } from 'vitest';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';
import { generateReport } from './generatePayloadReport.js';

describe('generatePayloadReport', () => {
  it(
    'should match snapshot',
    async () => {
      const report = await generateReport({
        ...(MOCK_PAYLOAD as any),
        client: CHAIN_ID_CLIENT_MAP[MOCK_PAYLOAD.simulation.transaction.network_id],
      });
      expect(report).toMatchSnapshot();
    },
    { timeout: 30000 }
  );
});
