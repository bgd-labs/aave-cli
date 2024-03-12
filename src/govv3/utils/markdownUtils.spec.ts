import { describe, it, expect } from 'vitest';
import { formatNumberString } from './markdownUtils';

describe('formatNumberString', () => {
  it('should return correctly formatted int', () => {
    expect(formatNumberString('10')).toBe('10');
    expect(formatNumberString(10)).toBe('10');
    expect(formatNumberString('10000')).toBe('10,000');
  });

  it('should return correctly formatted decimals ', () => {
    expect(formatNumberString('10.00001')).toBe('10.00001');
    expect(formatNumberString('100000.00001')).toBe('100,000.00001');
    expect(formatNumberString('0.00001')).toBe('0.00001');
  });
});
