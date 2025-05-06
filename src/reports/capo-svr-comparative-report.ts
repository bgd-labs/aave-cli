import {formatUnits} from 'viem';
import {CapoSvrSnapshot} from './snapshot-types';

type Comparative = {
  regularAdapterPrice: string;
  svrAdapterPrice: string;
  diff: string;
  date: string;
};

export async function generateSvrCapoReport(snapshot: CapoSvrSnapshot) {
  let comparative: Comparative[] = [];

  for (const key in snapshot.comparative) {
    const price = snapshot.comparative[key];

    const svrAdapterPrice = formatUnits(BigInt(price.svrAdapterPrice), snapshot.decimals);
    const regularAdapterPrice = formatUnits(BigInt(price.regularAdapterPrice), snapshot.decimals);
    const difference =
      Number(svrAdapterPrice) > Number(regularAdapterPrice)
        ? Number(svrAdapterPrice) - Number(regularAdapterPrice)
        : Number(regularAdapterPrice) - Number(svrAdapterPrice);

    const diff = (
      (100 * difference) /
      ((Number(svrAdapterPrice) + Number(regularAdapterPrice)) / 2)
    ).toFixed(2);

    const formattedDate = formatTimestamp(price.timestamp);

    comparative.push({
      svrAdapterPrice,
      regularAdapterPrice,
      diff,
      date: formattedDate,
    });
  }

  comparative = comparative.slice(snapshot.minSnapshotDelay);

  // generate md report
  let content = '';
  content += `# Capo Comparative Report\n\n`;
  content += `# ${snapshot.sourceName} \n\n`;
  content += `- Difference between adapters using SVR and regular Chainlink Feeds\n\n`;
  content += `| SVR Adapter | Regular Adapter | Diff | Date |\n`;
  content += `| --- | --- | --- | --- |\n`;
  comparative.forEach((price) => {
    content += `| ${price.svrAdapterPrice} | ${price.regularAdapterPrice} | ${price.diff}% | ${price.date} |\n`;
  });
  return content;
}

function formatTimestamp(timestampInSec: number) {
  // Create a new Date object from the timestamp in seconds
  const date = new Date(timestampInSec * 1000);

  // Use the Intl.DateTimeFormat API to format the date
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    timeZone: 'GMT',
  }).format(date);
}
