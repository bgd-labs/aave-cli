// Based on https://github.com/Uniswap/governance-seatbelt/blob/main/checks/check-state-changes.ts
// adjusted for viem & aave governance v3
import {type Client, type Hex, getAddress, Address} from 'viem';
import type {StateDiff, TenderlySimulationResponse} from '../../utils/tenderlyClient';
import {findAsset} from '../utils/checkAddress';
import {addAssetSymbol, prettifyNumber, wrapInQuotes} from '../utils/markdownUtils';
import {getDecodedReserveData} from '../utils/reserveConfigurationInterpreter';
import {getContractName} from '../utils/solidityUtils';
import type {ProposalCheck} from './types';

type ValueType = string | Record<string, string>;

type Change = {
  name: string;
  before: string | Record<string, ValueType>;
  after: string;
  type?: string;
};

function resolveChain(chain: string[]) {
  return chain.join('.');
}

function getContractChanges(diffs: StateDiff[]) {
  const changes: Change[] = [];
  for (const diff of diffs) {
    if (!diff.soltype) {
      // In this branch, state change is not decoded, so return raw data of each storage write
      // (all other branches have decoded state changes)
      for (const w of diff.raw) {
        const oldVal = JSON.stringify(w.original);
        const newVal = JSON.stringify(w.dirty);
        changes.push({before: oldVal, after: newVal, name: `Slot \`${w.key}\``});
      }
    } else if (diff.soltype.simple_type) {
      // This is a simple type with a single changed value
      // const oldVal = JSON.parse(JSON.stringify(diff.original))
      // const newVal = JSON.parse(JSON.stringify(diff.dirty))
      changes.push({
        before: diff.original as string,
        after: diff.dirty as string,
        name: diff.soltype.name,
        type: diff.soltype?.name,
      });
    } else if (diff.soltype.type.startsWith('mapping')) {
      // This is a complex type like a mapping, which may have multiple changes. The diff.original
      // and diff.dirty fields can be strings or objects, and for complex types they are objects,
      // so we cast them as such
      const keys = Object.keys(diff.original);
      const original = diff.original as Record<string, any>;
      const dirty = diff.dirty as Record<string, any>;
      for (const k of keys as Hex[]) {
        changes.push({before: original[k], after: dirty[k], name: k, type: diff.soltype?.name});
      }
    } else {
      // TODO arrays and nested mapping are currently not well supported -- find a transaction
      // that changes state of these types to inspect the Tenderly simulation response and
      // handle it accordingly. In the meantime we show the raw state changes and print a
      // warning about decoding the data
      for (const w of diff.raw) {
        const oldVal = JSON.stringify(w.original);
        const newVal = JSON.stringify(w.dirty);
        // info += `\n        - Slot \`${w.key}\` changed from \`${oldVal}\` to \`${newVal}\``
        changes.push({before: oldVal, after: newVal, name: `Slot \`${w.key}\``});
        console.log(
          `Could not parse state: add support for formatting type ${diff.soltype?.type} (slot ${w.key})\n`,
        );
      }
    }
  }
  return changes;
}

async function renderContractChanges(
  simulation: TenderlySimulationResponse,
  client: Client,
  address: Hex,
  changes: Change[],
) {
  let stateChanges = `\n${getContractName(simulation.contracts, address, client.chain!.id)}\n\`\`\`diff\n`;
  for (const change of changes) {
    stateChanges += await deepDiff({
      client,
      address,
      before: change.before,
      after: change.after,
      accessChain: [change.name],
      type: change.type,
    });
  }
  stateChanges += '```\n';

  return stateChanges;
}

export async function deepDiff({
  client,
  address,
  before,
  after,
  accessChain,
  type,
}: {
  client: Client;
  address: Hex;
  before: Record<string, any> | string;
  after: Record<string, any> | string;
  accessChain: string[];
  type?: string;
}): Promise<string> {
  if (type && accessChain.length === 1 && ['_reserves', 'assets', 'assetsSources'].includes(type)) {
    accessChain[0] = await addAssetSymbol(client, accessChain[0] as Address);
  }
  if (typeof before !== 'object' || typeof after !== 'object') {
    return `@@ ${type ? `${wrapInQuotes(type, true)} key ` : ''}${wrapInQuotes(
      resolveChain(accessChain),
      !!type,
    )} @@\n- ${await enhanceValue({client, address, value: before as string, type, accessChain})}\n+ ${await enhanceValue(
      {
        client,
        address,
        value: after as string,
        type,
        accessChain,
      },
    )}\n`;
  }
  /**
   * Injecting the decoded configuration uint256 into the state diff
   */

  let result = '';
  if (type === '_reserves' && (before.configuration?.data || after.configuration?.data)) {
    before.configuration.data_decoded = getDecodedReserveData(address, before.configuration.data);
    after.configuration.data_decoded = getDecodedReserveData(address, after.configuration.data);
  }

  if (type === '_streams') {
    const asset = await findAsset(client, after.tokenAddress);
    after.ratePerSecond = prettifyNumber({decimals: asset.decimals, value: after.ratePerSecond});
    after.remainingBalance = prettifyNumber({
      decimals: asset.decimals,
      value: after.remainingBalance,
    });
  }

  for (const key of Object.keys(before)) {
    if (before[key] === after[key]) continue;

    const newAccessChain = [...accessChain];
    newAccessChain.push(key);
    if (typeof before[key] === 'object') {
      result += await deepDiff({
        client,
        address,
        before: before[key],
        after: after[key],
        accessChain: newAccessChain,
        type: type,
      });
    } else
      result += `@@ ${type ? `${wrapInQuotes(type, true)} key ` : ''}${wrapInQuotes(
        resolveChain([...accessChain, key]),
        !!type,
      )} @@\n- ${await enhanceValue({
        client,
        address,
        value: before[key],
        type,
        accessChain: newAccessChain,
      })}\n+ ${await enhanceValue({
        client,
        address,
        value: after[key],
        type,
        accessChain: newAccessChain,
      })}\n`;
  }
  return result;
}

async function enhanceValue({
  client,
  address,
  value,
  type,
  accessChain,
}: {
  client: Client;
  address: Hex;
  value: string;
  type?: string;
  accessChain: string[];
}) {
  const key = accessChain[accessChain?.length - 1];
  if (key === 'tokenAddress') {
    return addAssetSymbol(client, value as Address);
  }
  // if(accessChain.includes(''))
  if (type) {
    // values to be rendered with asset decimals
    if (
      [
        '_balances',
        'balanceOf',
        'balances',
        'allowed',
        '_allowances',
        'allowance',
        '_totalSupply',
      ].includes(type)
    ) {
      const asset = await findAsset(client, address);
      if (asset) return prettifyNumber({decimals: asset.decimals, value});
    }
    // values to be rendered with ray decimals
    if (key && ['_reserves'].includes(type)) {
      if (['liquidityIndex', 'variableBorrowIndex'].includes(key))
        return prettifyNumber({decimals: 27, value});
      if (['liquidationThreshold', 'reserveFactor', 'liquidationProtocolFee'].includes(key))
        return prettifyNumber({decimals: 2, value, suffix: '%'});
      if (
        ['currentLiquidityRate', 'currentVariableBorrowRate', 'currentStableBorrowRate'].includes(
          key,
        )
      )
        return prettifyNumber({decimals: 25, value, suffix: '%'});
    }
  }
  return value;
}

export const checkStateChanges: ProposalCheck<any> = {
  name: 'Reports all state changes',
  async checkProposal(proposal, simulation, client) {
    const info: string[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];
    if (!simulation.transaction.status) {
      const txInfo = simulation.transaction.transaction_info;
      const reason = txInfo.stack_trace ? txInfo.stack_trace[0].error_reason : 'unknown error';
      errors.push(`Transaction reverted with reason: ${reason}`);
    } else {
      // State diffs in the simulation are an array, so first we organize them by address.
      const stateDiffs = simulation.transaction.transaction_info.state_diff.reduce(
        (diffs, diff) => {
          // TODO: double check if that's safe to skip
          if (!diff.raw?.[0]) return diffs;
          const addr = getAddress(diff.raw[0].address);
          if (!diffs[addr]) diffs[addr] = [diff];
          else diffs[addr].push(diff);
          return diffs;
        },
        {} as Record<string, StateDiff[]>,
      );

      if (!Object.keys(stateDiffs).length) {
        warnings.push('No state changes detected');
      } else {
        let stateChanges = '';
        const warnings = '';
        // Parse state changes at each address
        for (const [address, diffs] of Object.entries(stateDiffs)) {
          const changes = getContractChanges(diffs);
          stateChanges += await renderContractChanges(simulation, client, address as Hex, changes);
        }

        info.push(stateChanges);
      }
    }
    return {info, warnings, errors};
  },
};
