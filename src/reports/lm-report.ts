import {type Hex} from 'viem';
import {toAddressLink} from '../govv3/utils/markdownUtils';
import {getClient} from '../utils/getClient';
import {formatTimestamp} from '../govv3/utils/markdownUtils';
import {LiquidityMiningSnapshot} from './snapshot-types';

export async function generateLiquidityMiningReport(snapshot: LiquidityMiningSnapshot) {
  let content = '';
  content += `# Liquidity Mining Report\n\n`;
  content += '<br/>\n\n';

  for (const key in snapshot) {
    const object = snapshot[key];

    content += `Asset: ${toAddressLink(object.asset as Hex, true, getClient(object.chainId))}\n\n`;
    content += `Reward: ${toAddressLink(object.reward as Hex, true, getClient(object.chainId))}\n\n`;
    content += `Type: ${object.type}\n\n`;
    if (object.index) content += `Index: ${object.index}\n\n`;

    if (object.newTransferStrategy) content += `_Transfer Strategy changed to: ${toAddressLink(object.newTransferStrategy as Hex, true, getClient(object.chainId))}_\n\n`;
    if (object.newRewardOracle) content += `_Reward Oracle changed to: ${toAddressLink(object.newRewardOracle as Hex, true, getClient(object.chainId))}_\n\n`;

    if (object.newDistributionEnd || object.newEmission) {
      content += `|  | prev value | newValue |\n`;
      content += `| - | - | - |\n`;
      if (object.newEmission && object.oldEmission) content += `| emissionPerSecond | ${object.oldEmission} | ${object.newEmission} |\n`;
      if (object.newDistributionEnd && object.oldDistributionEnd) content += `| emissionPerSecond | ${object.oldDistributionEnd} (${formatTimestamp(object.oldDistributionEnd)}) | ${object.newDistributionEnd} (${formatTimestamp(object.newDistributionEnd)}) |\n`;
    }

    content += '<br/>\n\n';
    content += '---';
  }

  return content;
}
