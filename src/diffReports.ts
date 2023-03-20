import { AaveV3Snapshot } from "./schema";
import diffler from "diffler";

function arrifyDiff(diff) {
  return {
    reserves:
      Object.entries(diff.reserves)
        .sort(([a], [b]) => a < b) // workaround for non-determinism on foundry
        .reduce(
          (acc, [key, value]) => {
            if (value.from === null) {
              acc.added.push(value);
              return acc;
            }
            if (value.to === null) {
              acc.removed.push(value);
              return acc;
            }
            acc.altered.push(value);
            return acc;
          },
          { added: [], removed: [], altered: [] }
        ) || [],
    strategies:
      Object.entries(diff.strategies)
        .sort(([a], [b]) => a < b) // workaround for non-determinism on foundry
        .reduce(
          (acc, [key, value]) => {
            if (value.from == null) {
              acc.added.push(value);
              return acc;
            }
            if (value.to == null) {
              acc.deprecated.push(value);
              return acc;
            }
            throw new Error("unexpected change in strategy");
          },
          { added: [], deprecated: [] }
        ) || [],
    eModes: [],
  };
}

export function diffReports(pre: AaveV3Snapshot, post: AaveV3Snapshot) {
  const diff = diffler(pre, post);
  const arryfiedDiff = arrifyDiff(diff);
  let content = "";
  content += `## Reserves\n\n`;
  content += `### Reserve altered\n\n`;
  for (const reserve of arryfiedDiff.reserves.altered) {
    content += `| key | value |\n`;
    content += `| --- | --- |\n`;
    Object.keys(reserve).map((key) => {
      content += `| ${key} | ~~${reserve[key].from}~~${reserve[key].to} |\n`;
    });
    content += `\n\n`;
  }
  content += `## Strategies\n\n`;
  // const added = diff.strategies.filter((strategy) => strategy.from == null);
  // const removed = diff.strategies.filter((strategy) => strategy.to == null);
  for (const strategy of arryfiedDiff.strategies.added) {
    content += `### Strategies added\n\n`;
  }

  for (const strategy of arryfiedDiff.strategies.deprecated) {
    content += `### Strategies deprecated\n\n`;
  }

  content += `### Raw diff\n\n\`\`\`json\n${JSON.stringify(
    diff,
    null,
    2
  )}\n\`\`\``;
  return content;
}
