import { fetchRateStrategyImage } from "./fetchIRStrategy";
import { renderReserve, renderReserveDiff } from "./renderer/reserve";
import { AaveV3Snapshot } from "./types";
import { diff } from "./utils/diff";

export async function diffReports<
  A extends AaveV3Snapshot,
  B extends AaveV3Snapshot
>(pre: A, post: B) {
  const chainId = pre.chainId;
  const diffResult = diff(pre, post);
  // download interest rate strategies
  // only downloads if it doesn't exist yet
  for (const ir in pre.strategies) {
    await fetchRateStrategyImage(pre.strategies[ir], `${chainId}_${ir}`);
  }
  for (const ir in post.strategies) {
    await fetchRateStrategyImage(post.strategies[ir], `${chainId}_${ir}`);
  }

  // create report
  let content = "";
  const reservesAdded = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // to being present on reserve level % trueish means reserve was added
      if ((diffResult.reserves[reserveKey] as any).to) {
        return renderReserve(
          (diffResult.reserves[reserveKey] as any).to,
          chainId
        );
      }
    })
    .filter((i) => i);
  const reservesRemoved = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // from being present on reserve level % trueish means reserve was removed
      if ((diffResult.reserves[reserveKey] as any).from) {
        return renderReserve(
          (diffResult.reserves[reserveKey] as any).from,
          chainId
        );
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
        return renderReserveDiff(
          diffResult.reserves[reserveKey] as any,
          chainId
        );
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
