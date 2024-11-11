import {describe, expect, it} from 'vitest';
import {Hash} from './onlyHash';

describe('validateAIP', () => {
  it('should succeed when all keys are present', async () => {
    const header = `---
title: TestTitle
discussions: TestDiscussion
author: TestAuthor
---`;
    expect(await Hash.of(header)).toBe(
      'bafkreidu7hxuf3jj6dmtvgtomaipokksxvy7uastfbkdu2zq3c4wrn7mb4',
    );
  });
});
