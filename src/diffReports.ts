import { renderReserve, renderReserveDiff } from "./renderer/reserve";
import { AaveV3Reserve, AaveV3Snapshot } from "./types";
import { diff } from "./utils/diff";

export function diffReports<A extends AaveV3Snapshot, B extends AaveV3Snapshot>(
  pre: A,
  post: B
) {
  const diffResult = diff(pre, post);
  let content = "";
  const reservesAdded = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // to being present on reserve level % trueish means reserve was added
      if ((diffResult.reserves[reserveKey] as any).to) {
        return renderReserve((diffResult.reserves[reserveKey] as any).to, 1);
      }
    })
    .filter((i) => i);
  const reservesRemoved = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // from being present on reserve level % trueish means reserve was removed
      if ((diffResult.reserves[reserveKey] as any).from) {
        return renderReserve((diffResult.reserves[reserveKey] as any).from, 1);
      }
    })
    .filter((i) => i);
  const reservesAltered = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // from being present on key means reserve was removed
      if (
        !(diffResult.reserves[reserveKey] as any).hasOwnProperty("from") &&
        Object.keys(diffResult.reserves[reserveKey]).find(
          (fieldKey) =>
            typeof diffResult.reserves[reserveKey][fieldKey] === "object"
        )
      ) {
        console.log(diffResult.reserves[reserveKey]);
        return renderReserveDiff(diffResult.reserves[reserveKey] as any, 1);
      }
    })
    .filter((i) => i);
  if (
    reservesAdded.length ||
    reservesRemoved.length ||
    reservesAltered.length
  ) {
    content += "## Reserve changes\n\n";
    if (reservesAdded.length) {
      content += `### ${
        reservesAdded.length > 1 ? "Reserve" : "Reserves"
      } added\n\n`;
      content += reservesAdded.join("\n\n");
      content += "\n\n";
    }

    if (reservesAltered.length) {
      content += `### ${
        reservesAltered.length > 1 ? "Reserve" : "Reserves"
      } altered\n\n`;
      content += reservesAltered.join("\n\n");
      content += "\n\n";
    }

    if (reservesRemoved.length) {
      content += `### ${
        reservesRemoved.length > 1 ? "Reserve" : "Reserves"
      } removed\n\n`;
      content += reservesRemoved.join("\n\n");
      content += "\n\n";
    }
  }

  content += `## Raw diff\n\n\`\`\`json\n${JSON.stringify(
    diff(pre, post, true),
    null,
    2
  )}\n\`\`\``;
  return content;
}
