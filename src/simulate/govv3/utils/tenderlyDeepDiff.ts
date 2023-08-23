/**
 * Generates a markdown diff for a nested tenderly state object
 * @param before
 * @param after
 * @param prefix
 * @returns
 */
export function tenderlyDeepDiff(
  before: Record<string, any> | string,
  after: Record<string, any> | string,
  prefix?: string
): string {
  if (typeof before !== 'object' || typeof after !== 'object') {
    return `${prefix ? `@@ ${prefix} @@\n` : ''}- ${before}
  + ${after}\n`;
  }
  return Object.keys(before).reduce((acc, key) => {
    if (before[key] === after[key]) return acc;
    if (typeof before[key] === 'object')
      return tenderlyDeepDiff(before[key], after[key], prefix ? `${prefix}.${key}` : key);
    return (
      acc +
      `@@ ${prefix ? `${prefix}.${key}` : key} @@
  - ${before[key]}
  + ${after[key]}\n`
    );
  }, '');
}
