import { renderReserves } from "./renderer/reserves";
import { AaveV3Snapshot } from "./types";
import { diffler } from "./utils/diffler";

export function diffReports<A extends AaveV3Snapshot, B extends AaveV3Snapshot>(
  pre: A,
  post: B
) {
  const diff = diffler(pre, post);
  let content = renderReserves(diff.reserves);

  content += `### Raw diff\n\n\`\`\`json\n${JSON.stringify(
    diff,
    null,
    2
  )}\n\`\`\``;
  return content;
}
