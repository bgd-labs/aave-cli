import { DiffedInput, AaveV3Reserve } from "../types";

export function renderReserves(reserves: DiffedInput<AaveV3Reserve>): string {
  const { added, removed, altered } = Object.entries(reserves)
    .sort(([keyA], [keyB]) => {
      return keyA.localeCompare(keyB, "en-US");
    })
    .reduce(
      (acc, [key, value]) => {
        if (value.from) {
          acc.removed.push(value.from);
        } else if (value.to) {
          acc.added.push(value.to);
        } else {
          acc.altered.push(value);
        }
        return acc;
      },
      {
        added: [] as AaveV3Reserve[],
        removed: [] as AaveV3Reserve[],
        altered: [] as {
          [K in keyof AaveV3Reserve]?: {
            from: AaveV3Reserve[K];
            to: AaveV3Reserve[K];
          };
        }[],
      }
    );
  if (!altered.length && !added.length && !removed.length) return "";
  let content = "";
  content += `## Reserves\n\n`;

  if (altered.length) {
    content += `### Reserve altered\n\n`;
    for (const reserve of altered) {
      content += `| key | value |\n`;
      content += `| --- | --- |\n`;
      Object.keys(reserve).map((key) => {
        content += `| ${key} | ~~${reserve[key].from}~~${reserve[key].to} |\n`;
      });
      content += `\n\n`;
    }
  }

  if (added.length) {
    content += `### Reserve added\n\n`;
    for (const reserve of added) {
      content += `| key | value |\n`;
      content += `| --- | --- |\n`;
      Object.keys(reserve).map((key) => {
        content += `| ${key} | ${reserve[key]} |\n`;
      });
      content += `\n\n`;
    }
  }

  if (removed.length) {
    content += `### Reserve added\n\n`;
    for (const reserve of removed) {
      content += `| key | value |\n`;
      content += `| --- | --- |\n`;
      Object.keys(reserve).map((key) => {
        content += `| ${key} | ${reserve[key]} |\n`;
      });
      content += `\n\n`;
    }
  }
  return content;
}
