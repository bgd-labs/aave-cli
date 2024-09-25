import {describe, expect, it} from 'vitest';
import pre32 from './mocks/pre3-2.json';
import post32 from './mocks/post3-2.json';
import {diffCode, downloadContract} from './code-diff';

describe.skip('code diffs', () => {
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
    },
    {timeout: 30000},
  );
});
