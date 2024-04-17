import hash from "object-hash";
import { diff } from "./diff";
import { renderEmode, renderEmodeDiff } from "./emode";
import { fetchRateStrategyImage } from "./fetch-IR-strategy";
import { renderReserve, renderReserveDiff } from "./reserve";
import { AaveV3Reserve, type AaveV3Snapshot } from "./snapshot-types";
import { renderStrategy, renderStrategyDiff } from "./strategy";

export async function diffReports<A extends AaveV3Snapshot, B extends AaveV3Snapshot>(pre: A, post: B) {
  const chainId = pre.chainId;
  const diffResult = diff(pre, post);
  // download interest rate strategies
  // only downloads if it doesn't exist yet
  for (const ir in pre.strategies) {
    await fetchRateStrategyImage(pre.strategies[ir]);
  }
  for (const ir in post.strategies) {
    await fetchRateStrategyImage(post.strategies[ir]);
  }

  // create report
  let content = "";
  const reservesAdded = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // to being present on reserve level % trueish means reserve was added
      if ((diffResult.reserves[reserveKey] as any).to) {
        let report = renderReserve((diffResult.reserves[reserveKey] as any).to, chainId);
        const imageHash = hash(post.strategies[reserveKey]);
        report += renderStrategy(post.strategies[reserveKey]);

        report += `| interestRate | ![ir](/.assets/${imageHash}.svg) |\n`;
        if (post.reserves[reserveKey].eModeCategory && post.reserves[reserveKey].eModeCategory !== 0) {
          report += renderEmode(post.eModes[post.reserves[reserveKey].eModeCategory]);
        }

        return report;
      }
    })
    .filter((i) => i);
  const reservesRemoved = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // from being present on reserve level % trueish means reserve was removed
      if ((diffResult.reserves[reserveKey] as any).from) {
        return renderReserve((diffResult.reserves[reserveKey] as any).from, chainId);
      }
    })
    .filter((i) => i);
  const reservesAltered = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // from being present on key means reserve was removed
      if (
        !(diffResult.reserves[reserveKey] as any).hasOwn("from") &&
        Object.keys(diffResult.reserves[reserveKey]).find(
          (fieldKey) => typeof (diffResult.reserves as any)[reserveKey][fieldKey] === "object",
        )
      ) {
        // diff reserve
        let report = renderReserveDiff(diffResult.reserves[reserveKey] as any, chainId);
        // diff irs
        const preIrHash = hash(pre.strategies[reserveKey]);
        const postIrHash = hash(post.strategies[reserveKey]);
        if (preIrHash !== postIrHash) {
          report += renderStrategyDiff(diff(pre.strategies[reserveKey], post.strategies[reserveKey]) as any);
          report += `| interestRate | ![before](/.assets/${preIrHash}.svg) | ![after](/.assets/${postIrHash}.svg) |`;
        }
        // diff eModes
        if (diffResult.reserves[reserveKey].eModeCategory?.hasOwn("from")) {
          report += renderEmodeDiff(
            diff(
              pre.eModes[(diffResult.reserves[reserveKey].eModeCategory as any).from] || {},
              post.eModes[(diffResult.reserves[reserveKey].eModeCategory as any).to],
            ) as any,
          );
        }

        return report;
      }
    })
    .filter((i) => i);
  if (reservesAdded.length || reservesRemoved.length || reservesAltered.length) {
    content += "## Reserve changes\n\n";
    if (reservesAdded.length) {
      content += `### ${reservesAdded.length > 1 ? "Reserve" : "Reserves"} added\n\n`;
      content += reservesAdded.join("\n\n");
      content += "\n\n";
    }

    if (reservesAltered.length) {
      content += `### ${reservesAltered.length > 1 ? "Reserve" : "Reserves"} altered\n\n`;
      content += reservesAltered.join("\n\n");
      content += "\n\n";
    }

    if (reservesRemoved.length) {
      content += `### ${reservesRemoved.length > 1 ? "Reserve" : "Reserves"} removed\n\n`;
      content += reservesRemoved.join("\n\n");
      content += "\n\n";
    }
  }

  content += `## Raw diff\n\n\`\`\`json\n${JSON.stringify(diff(pre, post, true), null, 2)}\n\`\`\``;
  return content;
}
