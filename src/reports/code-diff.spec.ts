import {describe, expect, it} from 'vitest';
import pre32 from './mocks/pre3-2.json';
import post32 from './mocks/post3-2.json';
import {diffCode, downloadContract} from './code-diff';
import {diffRawStorage, diffSlot} from './raw-storage-diff';

describe.skip('code diffs', () => {
  it('should diff slots', () => {
    diffSlot(1, '0x0', {
      previousValue: '0x0000000000000000000000003d881c2dc90f00e7a52f06155f77fbec63a779c7',
      newValue: '0x00000000000000000000000056401d666f486c495566a29249447c2bb8c56bb2',
    });
  });
  it('should diff contracts', async () => {
    await diffRawStorage(1, {
      '0x0aa97c284e98396202b6a04024f5e2c65026f3c0': {
        label: null,
        balanceDiff: null,
        stateDiff: {
          '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc': {
            previousValue: '0x0000000000000000000000003d881c2dc90f00e7a52f06155f77fbec63a779c7',
            newValue: '0x00000000000000000000000056401d666f486c495566a29249447c2bb8c56bb2',
          },
        },
      },
    });
  });
  it.skip(
    'should download contract',
    () => {
      downloadContract(pre32.chainId, pre32.poolConfig.poolConfigurator);
    },
    {timeout: 30000},
  );

  it.skip(
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
