import {describe, expect, it} from 'vitest';
import pre32 from './mocks/pre3-2.json';
import post32 from './mocks/post3-2.json';
import {diffCode, downloadContract} from './code-diff';
import {diffSlot} from './raw-storage-diff';

describe.skip('code diffs', () => {
  it('should diff slots', () => {
    diffSlot(1, '0x0', {
      previousValue: '0x4816b2C2895f97fB918f1aE7Da403750a0eE372e',
      newValue: '0xE5e48Ad1F9D1A894188b483DcF91f4FaD6AbA43b',
    });
  });
  it(
    'should download contract',
    () => {
      downloadContract(pre32.chainId, pre32.poolConfig.poolConfigurator);
    },
    {timeout: 30000},
  );

  it(
    'should diff the contract',
    () => {
      const from = downloadContract(pre32.chainId, pre32.poolConfig.poolConfiguratorImpl);
      const to = downloadContract(post32.chainId, post32.poolConfig.poolConfiguratorImpl);
      const result = diffCode(from, to);

      expect(result).toMatchSnapshot();
    },
    {timeout: 30000},
  );
});
