import { Client, Hex, formatUnits } from 'viem';
import { Input } from '../../utils/tenderlyClient';
import { formatNumberString } from './markdownUtils';
import { findAsset } from './checkAddress';

const decimalAmountEvents = [
  'Transfer',
  'Approval',
  'Burn',
  'Mint',
  'BalanceTransfer',
  'Withdraw',
  'Supply',
  'Deposit',
];

export async function interpretLog(client: Client, address: Hex, name: string | null, inputs: Input[]) {
  if (name && decimalAmountEvents.includes(name)) {
    // fields formatted by the asset decimal
    const decimalFieldNames = ['value', 'amount', 'wad'];
    for (const name of decimalFieldNames) {
      const valueIndex = inputs.findIndex((i) => i.soltype!.name === name);
      if (valueIndex !== -1) {
        const asset = await findAsset(client, address);
        inputs[valueIndex].value = `${formatNumberString(
          formatUnits(BigInt(inputs[valueIndex].value as string), asset.decimals)
        )}[${inputs[valueIndex].value}]`;
      }
    }
  }
  if (name && ['Mint', 'ReserveDataUpdated', 'Burn'].includes(name)) {
    // fields formatted by the asset decimal
    const decimalFieldNames = ['liquidityIndex', 'variableBorrowIndex', 'index'];
    for (const name of decimalFieldNames) {
      const valueIndex = inputs.findIndex((i) => i.soltype!.name === name);
      if (valueIndex !== -1) {
        inputs[valueIndex].value = `${formatNumberString(
          formatUnits(BigInt(inputs[valueIndex].value as string), 27)
        )}[${inputs[valueIndex].value}]`;
      }
    }
  }
  const parsedInputs = inputs?.map((i) => `${i.soltype!.name}: ${i.value}`).join(', ');
  return `  - \`${name}(${parsedInputs || ''})\``;
}
