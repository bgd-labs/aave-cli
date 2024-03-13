import { describe, it, expect } from 'vitest';
import { MOCK_PAYLOAD } from '../mocks/payload';
import { checkStateChanges } from './state';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';

describe('state check', () => {
  it('should correctly render state diff', async () => {
    const result = await checkStateChanges.checkProposal(
      MOCK_PAYLOAD.payloadInfo,
      MOCK_PAYLOAD.simulation,
      CHAIN_ID_CLIENT_MAP[MOCK_PAYLOAD.simulation.transaction.network_id]
    );
    expect(result).toMatchSnapshot();
  });
});
