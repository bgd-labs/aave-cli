import { describe, it, expect } from 'vitest';
import { findContractDeploymentBlock } from './logs';
import { GovernanceV3Ethereum } from '@bgd-labs/aave-address-book';
import { mainnetClient } from './rpcClients';

describe('logs', () => {
  it(
    'findContractDeploymentBlock',
    async () => {
      const address = GovernanceV3Ethereum.GOVERNANCE;
      const block = await findContractDeploymentBlock(mainnetClient, 0n, await mainnetClient.getBlockNumber(), address);
      expect(block).toBeGreaterThan(18018794n - 200000n);
    },
    { timeout: 10000 }
  );
});
