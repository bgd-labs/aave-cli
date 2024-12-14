import {Client, type Hex} from 'viem';
import {getClient} from '../utils/getClient';
import {formatTimestamp, toAddressLink, addAssetSymbolWithLink, addAssetPrice} from '../govv3/utils/markdownUtils';
import {LiquidityMiningSnapshot} from './snapshot-types';

export async function generateLiquidityMiningReport(snapshot: LiquidityMiningSnapshot) {
  let content = '';
  content += `# Liquidity Mining Report\n\n`;
  content += '<br/>\n\n';

  for (const key in snapshot) {
    content += '---\n\n';
    const object = snapshot[key];

    content += `Asset: ${await addAssetSymbolWithLink(getClient(object.chainId) as Client, object.asset as Hex)}\n\n`;
    content += `Reward: ${await addAssetSymbolWithLink(getClient(object.chainId) as Client, object.reward as Hex)}\n\n`;
    content += `Type: ${object.type}\n\n`;
    if (object.index) content += `Index: ${object.index}\n\n`;

    if (object.newTransferStrategy) content += `_Transfer Strategy changed to: ${toAddressLink(object.newTransferStrategy as Hex, true, getClient(object.chainId))}_\n\n`;
    if (object.newRewardOracle) content += `_Reward Oracle changed to: ${toAddressLink(object.newRewardOracle as Hex, true, getClient(object.chainId))} ${await addAssetPrice(getClient(object.chainId) as Client, object.newRewardOracle as Hex)}_\n\n`;

    if (object.newDistributionEnd || object.newEmission) {
      content += `|  | prev value | newValue |\n`;
      content += `| - | - | - |\n`;
      if (object.newEmission && object.oldEmission) content += `| emissionPerSecond | ${object.oldEmission} | ${object.newEmission} |\n`;
      if (object.newDistributionEnd && object.oldDistributionEnd) content += `| emissionPerSecond | ${object.oldDistributionEnd} (${formatTimestamp(object.oldDistributionEnd)}) | ${object.newDistributionEnd} (${formatTimestamp(object.newDistributionEnd)}) |\n`;
    }

    content += '<br/>\n\n';
    content += '---\n';
  }

  return content;
}
