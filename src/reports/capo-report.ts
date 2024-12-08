import {formatUnits} from 'viem';
import {formatTimestamp} from '../govv3/utils/markdownUtils';
import {CapoSnapshot} from './snapshot-types';

type Price = {
  sourcePrice: string;
  referencePrice: string;
  diff: string;
  dayToDayGrowth: string;
  smoothedGrowth: string;
  date: string;
};

export async function generateCapoReport(snapshot: CapoSnapshot) {
  // map to dates and formatted values

  let prices: Price[] = [];

  let maxDayToDayGrowth = 0;
  let maxSmoothedGrowth = 0;

  for (const key in snapshot.prices) {
    const price = snapshot.prices[key];

    const sourcePrice = formatUnits(BigInt(price.sourcePrice), snapshot.decimals);
    const referencePrice = formatUnits(BigInt(price.referencePrice), snapshot.decimals);
    const dayToDayGrowth = (price.dayToDayGrowth / 100).toFixed(2);
    const smoothedGrowth = (price.smoothedGrowth / 100).toFixed(2);
    const diff = (
      (100 * (Number(sourcePrice) - Number(referencePrice))) /
      ((Number(sourcePrice) + Number(referencePrice)) / 2)
    ).toFixed(2);

    const formattedDate = formatTimestamp(price.timestamp);

    prices.push({
      sourcePrice,
      referencePrice,
      diff,
      dayToDayGrowth,
      smoothedGrowth,
      date: formattedDate,
    });

    maxDayToDayGrowth = Math.max(maxDayToDayGrowth, price.dayToDayGrowth);
    maxSmoothedGrowth = Math.max(maxSmoothedGrowth, price.smoothedGrowth);
  }

  prices = prices.slice(snapshot.minSnapshotDelay);

  // generate md report
  let content = '';
  content += `# Capo Report\n\n`;
  content += `| ${snapshot.source} | ${snapshot.reference} | Diff | Date | ${snapshot.minSnapshotDelay}-day growth in yearly % |\n`;
  content += `| --- | --- | --- | --- | --- |\n`;
  prices.forEach((price) => {
    content += `| ${price.sourcePrice} | ${price.referencePrice} | ${price.diff}% | ${price.date} | ${price.smoothedGrowth}% |\n`;
  });
  content += `\n\n`;
  content += `* ${snapshot.minSnapshotDelay}-day growth is calculated as an annualized percentage relative to the value of the rate ${snapshot.minSnapshotDelay} days prior. \n`;
  const maxYearlyGrowthPercent = (snapshot.maxYearlyGrowthPercent / 100).toFixed(2);
  const maxDayToDayGrowthPercent = (maxDayToDayGrowth / 100).toFixed(2);
  const maxSmoothedGrowthPercent = (maxSmoothedGrowth / 100).toFixed(2);

  content += `\n\n`;
  content += `| Max Yearly % | Max Day-to-day yearly % | Max ${snapshot.minSnapshotDelay}-day yearly % | \n`;
  content += `| --- | --- | --- |\n`;
  content += `| ${maxYearlyGrowthPercent}% | ${maxDayToDayGrowthPercent}% | ${maxSmoothedGrowthPercent}% | \n`;
  content += `\n\n`;

  content += `* Max day-to-day yearly % indicates the maximum growth between two emissions as an annualized percentage. \n`;

  return content;
}
