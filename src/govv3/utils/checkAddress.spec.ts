import { describe, it, expect } from 'vitest';
import { isKnownAddress } from './checkAddress';
import { ChainId } from '@bgd-labs/js-utils';
import { GovernanceV3Ethereum } from '@bgd-labs/aave-address-book';

describe('isKnownAddress', () => {
  it('should return path on correct network', () => {
    const path = isKnownAddress(GovernanceV3Ethereum.EXECUTOR_LVL_1, ChainId.mainnet);
    expect(path && path.includes('GovernanceV3Ethereum.EXECUTOR_LVL_1')).toBe(true);
  });

  it('should not return path on different network ', () => {
    const path = isKnownAddress(GovernanceV3Ethereum.EXECUTOR_LVL_1, ChainId.polygon);
    expect(path).toBe(undefined);
  });
});
