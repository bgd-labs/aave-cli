import { fetchRateStrategyImage } from "../fetchIRStrategy";
import { DiffedInput, AaveV3Reserve, AaveV3Snapshot } from "../types";

function renderReserveValue(key: keyof AaveV3Reserve, value) {
  if (key === "reserveFactor") return `${value / 1000} %`;
  if (key === "interestRateStrategy") return `![](./assets/${value}.svg)`;
  return value;
}

export function renderReserves(
  from: AaveV3Snapshot,
  to: AaveV3Snapshot,
  reserves: DiffedInput<AaveV3Reserve>
): string {
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
    content += `### Reserves altered\n\n`;
    for (const reserve of altered) {
      content += `| key | value |\n`;
      content += `| --- | --- |\n`;
      Object.keys(reserve).map((key) => {
        content += `| ${key} | ~~${renderReserveValue(
          key,
          reserve[key].from
        )}~~${renderReserveValue(key, reserve[key].to)} |\n`;
      });
      content += `\n\n`;
      // prepare assets
      if (reserve.interestRateStrategy) {
        fetchRateStrategyImage(
          from.strategies[reserve.interestRateStrategy.from],
          `./assets/`,
          reserve.interestRateStrategy.from
        );
        fetchRateStrategyImage(
          to.strategies[reserve.interestRateStrategy.to],
          `./assets/`,
          reserve.interestRateStrategy.to
        );
      }
    }
  }

  if (added.length) {
    content += `### Reserves added\n\n`;
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
    content += `### Reserves added\n\n`;
    for (const reserve of removed) {
      content += `| key | value |\n`;
      content += `| --- | --- |\n`;
      Object.keys(reserve).map((key) => {
        content += `| ${key} | ${reserve[key]} |\n`;
      });
      content += `\n\n`;

      // prepare assets
      if (reserve.interestRateStrategy) {
        fetchRateStrategyImage(
          to.strategies[reserve.interestRateStrategy],
          `./assets/`,
          reserve.interestRateStrategy
        );
      }
    }
  }
  return content;
}
