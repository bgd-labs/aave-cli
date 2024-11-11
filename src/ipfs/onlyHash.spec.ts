import {describe, expect, it} from 'vitest';
import {Hash} from './onlyHash';

describe('validateHash', () => {
  it('should generate same hash', async () => {
    const header = `---
title: TestTitle
discussions: TestDiscussion
author: TestAuthor
---`;
    expect(await Hash.of(header)).toBe('QmYMiDJUYXGsUng5rAgwgLvZzLEMjbhaWALFbQJjC6saPv');
  });
});
