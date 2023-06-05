import { describe, it, expect } from 'vitest';
import pre from './mocks/preTestEngineArbV3.json';
import post from './mocks/postTestEngineArbV3.json';
import { diff } from './diff';

describe('diff', () => {
  it('should return same object if no changes were found', () => {
    const input = { a: 'a' };
    const out = diff(input, { ...input });
    expect(JSON.stringify(input)).eq(JSON.stringify(out));
  });

  it('should return same object if no changes were found (nested)', () => {
    const input = { a: { a: 'a' } };
    const out = diff(input, { ...input });
    expect(JSON.stringify(input)).eq(JSON.stringify(out));
  });

  it('should return same object if no changes were found (nested)', () => {
    const input0 = { a: { a: 'a' } } as const;
    const input1 = { a: { a: 'b' } } as const;
    const out = diff(input0, input1);
    expect(out.a.a).eql({ from: 'a', to: 'b' });
  });

  it('should find all the changes', () => {
    const out = diff(pre, post, true);
    console.log(JSON.stringify(out, null, 2));
  });
});
