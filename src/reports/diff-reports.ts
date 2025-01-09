import {writeFileSync} from 'fs';
import {diff} from './diff';
import {renderEmodeDiff} from './emode';
import {getStrategyImageUrl} from './fetch-IR-strategy';
import {renderReserve, renderReserveDiff} from './reserve';
import {AaveV3Reserve, type AaveV3Snapshot} from './snapshot-types';
import {renderStrategy, renderStrategyDiff} from './strategy';
import {diffCode, downloadContract} from './code-diff';

function hasDiff(input: Record<string, any>): boolean {
  if (!input) return false;
  return !!Object.keys(input).find(
    (key) =>
      typeof input[key as keyof typeof input] === 'object' &&
      input[key as keyof typeof input] !== null &&
      (input[key as keyof typeof input].hasOwnProperty('from') ||
        input[key as keyof typeof input].hasOwnProperty('to')),
  );
}

export async function diffReports<A extends AaveV3Snapshot, B extends AaveV3Snapshot>(
  pre: A,
  post: B,
) {
  const chainId = pre.chainId;
  const diffResult = diff(pre, post);
  const diffResultWithoutUnchanged = diff(pre, post, true);

  // create report
  let content = '';
  const reservesAdded = Object.keys(diffResult.reserves)
    .map((reserveKey) => {
      // to being present on reserve level % trueish means reserve was added
      if ((diffResult.reserves[reserveKey] as any).to) {
        let report = renderReserve((diffResult.reserves[reserveKey] as any).to, chainId);
        report += renderStrategy(post.strategies[reserveKey]);
        report += `| interestRate | ![ir](${getStrategyImageUrl(post.strategies[reserveKey])}) |\n`;

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
      // "from" being present on reserses key means reserve was removed
      if (!(diffResult.reserves[reserveKey] as any).hasOwnProperty('from')) {
        const hasChangedReserveProperties = hasDiff(diffResult.reserves[reserveKey]);
        const preIr = getStrategyImageUrl(pre.strategies[reserveKey]);
        const postIr = getStrategyImageUrl(post.strategies[reserveKey]);
        const hasChangedIr = preIr !== postIr;
        if (!hasChangedReserveProperties && !hasChangedIr) return;
        // diff reserve
        let report = renderReserveDiff(diffResult.reserves[reserveKey] as any, chainId);
        // diff irs
        if (hasChangedIr) {
          report += renderStrategyDiff(
            diff(pre.strategies[reserveKey], post.strategies[reserveKey]) as any,
          );
          report += `| interestRate | ![before](${preIr}) | ![after](${postIr}) |`;
        }

        return report;
      }
    })
    .filter((i) => i);
  if (reservesAdded.length || reservesRemoved.length || reservesAltered.length) {
    content += '## Reserve changes\n\n';
    if (reservesAdded.length) {
      content += `### ${reservesAdded.length > 1 ? 'Reserve' : 'Reserves'} added\n\n`;
      content += reservesAdded.join('\n\n');
      content += '\n\n';
    }

    if (reservesAltered.length) {
      content += `### ${reservesAltered.length > 1 ? 'Reserve' : 'Reserves'} altered\n\n`;
      content += reservesAltered.join('\n\n');
      content += '\n\n';
    }

    if (reservesRemoved.length) {
      content += `### ${reservesRemoved.length > 1 ? 'Reserve' : 'Reserves'} removed\n\n`;
      content += reservesRemoved.join('\n\n');
      content += '\n\n';
    }
  }

  if (diffResultWithoutUnchanged.eModes) {
    content += '## Emodes changed\n\n';
    for (const eMode of Object.keys(diffResult.eModes)) {
      const hasChanges = hasDiff(diffResult.eModes?.[eMode]);
      content += `### EMode: ${post.eModes[eMode].label}(id: ${post.eModes[eMode].eModeCategory})\n\n`;
      if (hasChanges) {
        content += renderEmodeDiff(
          diff(pre.eModes[eMode] || {}, post.eModes[eMode] || {}) as any,
          pre,
          post,
        );
      } else if (!pre.eModes[eMode] || !post.eModes[eMode]) {
        content += renderEmodeDiff(
          diff(pre.eModes[eMode] || {}, post.eModes[eMode] || {}) as any,
          pre,
          post,
        );
      }
      content += '\n\n';
    }
  }

  try {
    if (diffResultWithoutUnchanged.poolConfig) {
      for (const key of Object.keys(diffResult.poolConfig)) {
        try {
          if (
            typeof (diffResult as any).poolConfig[key] === 'object' &&
            (diffResult as any).poolConfig[key].hasOwnProperty('from')
          ) {
            const fromAddress = (diffResult as any).poolConfig[key].from;
            const toAddress = (diffResult as any).poolConfig[key].to;
            const from = downloadContract(pre.chainId, fromAddress);
            const to = downloadContract(pre.chainId, toAddress);
            const result = diffCode(from, to);
            writeFileSync(`./diffs/${pre.chainId}_${key}_${fromAddress}_${toAddress}.diff`, result);
          }
        } catch (e) {
          console.info('error diffing the code');
          console.info(
            'this can happen if etherscan is not available, the code is not verified or not deployed yet',
          );
        }
      }
    }
  } catch (e) {}

  content += `## Raw diff\n\n\`\`\`json\n${JSON.stringify(diffResultWithoutUnchanged, null, 2)}\n\`\`\``;
  return content;
}
