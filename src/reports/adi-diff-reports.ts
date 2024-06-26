import {diff} from './diff';
import type {ADISnapshot} from './snapshot-types';

export async function adiDiffReports<A extends ADISnapshot, B extends ADISnapshot>(
  pre: A,
  post: B,
) {
  const chainId = pre.chainId;
  const diffResult = diff(pre, post);

  // create report
  let content = '';

  content += `## Raw diff\n\n\`\`\`json\n${JSON.stringify(diff(pre, post, true), null, 2)}\n\`\`\``;
  return content;
}
