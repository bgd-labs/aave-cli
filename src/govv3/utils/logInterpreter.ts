import { Client, Hex, formatUnits } from 'viem';
import { Input } from '../../utils/tenderlyClient';
import { formatNumberString } from './markdownUtils';
import { findAsset } from './checkAddress';

const commonEvents = ['Transfer', 'Approval', 'Burn', 'Mint', 'BalanceTransfer', 'Withdraw', 'Supply', 'Deposit'];

export async function interpretLog(client: Client, address: Hex, name: string | null, inputs: Input[]) {
  if (name && commonEvents.includes(name)) {
    const asset = await findAsset(client, address);
    const valueIndex = inputs.findIndex(
      (i) =>
        i.soltype!.name === 'value' /* erc20 */ ||
        i.soltype!.name === 'amount' /* aave */ ||
        i.soltype!.name === 'wad' /* dai */
    );
    if (valueIndex !== -1) {
      inputs[valueIndex].value = formatNumberString(
        formatUnits(BigInt(inputs[valueIndex].value as string), asset.decimals)
      );
    }
  }
  const parsedInputs = inputs?.map((i) => `${i.soltype!.name}: ${i.value}`).join(', ');
  return `  - \`${name}(${parsedInputs || ''})\``;
}
