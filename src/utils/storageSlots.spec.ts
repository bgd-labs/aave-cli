import {describe, expect, it} from 'vitest';
import {bytes32ToAddress, setBits} from './storageSlots';

describe('solidityUtils', () => {
  it('setBits', async () => {
    expect(setBits('0b11', 1n, 2n, 0n)).toBe(1n);
    expect(setBits('0b111', 1n, 2n, 0n)).toBe(5n);
    expect(setBits('0b111', 1n, 3n, 0n)).toBe(1n);
    expect(setBits('0b111', 0n, 3n, 0n)).toBe(0n);
  });

  it('extracts address', () => {
    expect(
      bytes32ToAddress('0x0000000000000000000000004816b2c2895f97fb918f1ae7da403750a0ee372e'),
    ).toBe('0x4816b2C2895f97fB918f1aE7Da403750a0eE372e');
  });
});
