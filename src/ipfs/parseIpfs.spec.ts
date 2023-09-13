import { describe, it, expect } from 'vitest';
import { getProposalMetadata } from './parseIpfs';

describe('parse-ipfs', () => {
  it('should work fine with json proposals', async () => {
    const hash = 'QmNgK8kbBgznCag29VwwBz5Q8DXDM658BQzsfAHyLqR7mF';
    const proposal = await getProposalMetadata(hash);
    expect(proposal.title).toBe('Add cbETH to Aave V3 Ethereum');
  });

  it('should work fine with text proposals', async () => {
    const hash = `Qmaxgt7HX9k4AdgixFLGTVnS17WYq9YguN1f3ncKW1HxBV`;
    const proposal = await getProposalMetadata(hash);
    expect(proposal.title).toBe('Chaos Labs Risk Parameter Updates _ Aave V3 Ethereum');
  });
});
