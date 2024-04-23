import {type Client, type Hex, formatUnits, Address} from 'viem';
import type {Input} from '../../utils/tenderlyClient';
import {findAsset} from './checkAddress';
import {addAssetSymbol, formatNumberString, prettifyNumber} from './markdownUtils';

// events emitted typically on the erc20
const tokenAmountEvents = ['Transfer', 'Approval', 'Burn', 'Mint', 'BalanceTransfer'];

// events emitted on the pool
const reserveEvents = ['Withdraw', 'Supply', 'Deposit'];

const assetFields = ['asset', 'token', 'reserve', 'fromToken', 'toToken'];

export async function interpretLog(
  client: Client,
  address: Hex,
  name: string | null,
  inputs: Input[] | null,
) {
  if (inputs) {
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].soltype?.name && assetFields.includes(inputs[i].soltype!.name)) {
        inputs[i].value = await addAssetSymbol(client, inputs[i].value as Address);
      }
    }
    if (name && tokenAmountEvents.includes(name)) {
      // fields formatted by the asset decimal
      const decimalFieldNames = ['value', 'amount', 'wad'];
      for (const name of decimalFieldNames) {
        const valueIndex = inputs.findIndex((i) => i.soltype!.name === name);
        if (valueIndex !== -1) {
          const asset = await findAsset(client, address);
          if (asset) {
            inputs[valueIndex].value = prettifyNumber({
              value: inputs[valueIndex].value as string,
              decimals: asset.decimals,
            });
          }
        }
      }
    }
    if (name && reserveEvents.includes(name)) {
      const valueIndex = inputs.findIndex((i) => i.soltype!.name === 'amount');
      const reserveIndex = inputs.findIndex((i) => i.soltype!.name === 'reserve');
      if (valueIndex !== -1 && reserveIndex !== -1) {
        const asset = await findAsset(client, inputs[reserveIndex].value as Hex);
        if (asset) {
          inputs[valueIndex].value = prettifyNumber({
            value: inputs[valueIndex].value as string,
            decimals: asset.decimals,
          });
        }
      }
    }
    if (name && ['Mint', 'ReserveDataUpdated', 'Burn'].includes(name)) {
      // fields formatted by the asset decimal
      const decimalFieldNames = ['liquidityIndex', 'variableBorrowIndex', 'index'];
      for (const name of decimalFieldNames) {
        const valueIndex = inputs.findIndex((i) => i.soltype!.name === name);
        if (valueIndex !== -1) {
          inputs[valueIndex].value = prettifyNumber({
            value: inputs[valueIndex].value as string,
            decimals: 27,
          });
        }
      }
    }
  }
  const parsedInputs = inputs
    ?.map(
      (i) =>
        `${i.soltype!.name}: ${typeof i.value === 'object' ? JSON.stringify(i.value) : i.value}`,
    )
    .join(', ');
  return `  - \`${name}(${parsedInputs || ''})\``;
}
