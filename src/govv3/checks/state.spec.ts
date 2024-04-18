import {CHAIN_ID_CLIENT_MAP} from '@bgd-labs/js-utils';
import {describe, expect, it} from 'vitest';
import {CONFIG_CHANGE_PAYLOAD} from '../mocks/configChangePayload';
import {MOCK_PAYLOAD} from '../mocks/payload';
import {checkStateChanges} from './state';

describe('state check', () => {
  it('should correctly render state diff for', async () => {
    const result = await checkStateChanges.checkProposal(
      null as any,
      MOCK_PAYLOAD.simulation,
      CHAIN_ID_CLIENT_MAP[MOCK_PAYLOAD.simulation.transaction.network_id],
    );
    expect(result).toMatchSnapshot();
  });
  it('should correctly render state diff for config change', async () => {
    const result = await checkStateChanges.checkProposal(
      null as any,
      CONFIG_CHANGE_PAYLOAD.simulation,
      CHAIN_ID_CLIENT_MAP[1],
    );
    expect(result).toMatchSnapshot();
  });
});
