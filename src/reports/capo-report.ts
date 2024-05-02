import {formatUnits} from 'viem';
import {CapoSnapshot} from './snapshot-types';

type Price = {
  sourcePrice: string;
  referencePrice: string;
  diff: string;
  date: string;
};

export async function generateCapoReport(snapshot: CapoSnapshot) {
  // map to dates and formatted values

  const prices: Price[] = [];

  for (const key in snapshot.prices) {
    const price = snapshot.prices[key];

    const sourcePrice = formatUnits(BigInt(price.sourcePrice), snapshot.decimals);
    const referencePrice = formatUnits(BigInt(price.referencePrice), snapshot.decimals);
    const diff = (
      (100 * (Number(sourcePrice) - Number(referencePrice))) /
      ((Number(sourcePrice) + Number(referencePrice)) / 2)
    ).toFixed(2);

    const formattedDate = formatTimestamp(price.timestamp);

    prices.push({
      sourcePrice,
      referencePrice,
      diff,
      date: formattedDate,
    });
  }

  // generate md report
  let content = '';
  content += `# Capo Report\n\n`;
  content += `| ${snapshot.source} | ${snapshot.reference} | Diff | Date |\n`;
  content += `| --- | --- | --- | --- |\n`;
  prices.forEach((price) => {
    content += `| ${price.sourcePrice} | ${price.referencePrice} | ${price.diff}% | ${price.date} |\n`;
  });

  return content;
}

function formatTimestamp(timestampInSec: number) {
  // Create a new Date object from the timestamp in seconds
  const date = new Date(timestampInSec * 1000);

  // Define the desired format string
  const format = 'dd-MMM-yyyy';

  // Use the Intl.DateTimeFormat API to format the date
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date);
}
