import {describe, expect, it} from 'vitest';
import {CONFIG_CHANGE_PAYLOAD} from '../mocks/configChangePayload';
import {MOCK_PAYLOAD} from '../mocks/payload';
import {checkStateChanges} from './state';
import {getClient} from '../../utils/getClient';

describe('state check', {timeout: 60000}, () => {
  it('should correctly render state diff for', async () => {
    const result = await checkStateChanges.checkProposal(
      null as any,
      MOCK_PAYLOAD.simulation,
      getClient(1),
    );
    expect(result).toMatchSnapshot();
  });
  it('should correctly render state diff for config change', async () => {
    const result = await checkStateChanges.checkProposal(
      null as any,
      CONFIG_CHANGE_PAYLOAD.simulation,
      getClient(1),
    );
    expect(result).toMatchSnapshot();
  });
});
