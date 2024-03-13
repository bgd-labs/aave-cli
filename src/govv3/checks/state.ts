// Based on https://github.com/Uniswap/governance-seatbelt/blob/main/checks/check-state-changes.ts
// adjusted for viem & aave governance v3
import { Client, Hex, formatUnits, getAddress } from 'viem';
import { ProposalCheck } from './types';
import { getContractName } from '../utils/solidityUtils';
import { StateDiff, TenderlySimulationResponse } from '../../utils/tenderlyClient';
import { findAsset } from '../utils/checkAddress';
import { formatNumberString } from '../utils/markdownUtils';

type ValueType = string | Record<string, string>;

type Change = { name: string; before: string | Record<string, ValueType>; after: string; type?: string };

function getContractChanges(diffs: StateDiff[]) {
  let changes: Change[] = [];
  for (const diff of diffs) {
    if (!diff.soltype) {
      // In this branch, state change is not decoded, so return raw data of each storage write
      // (all other branches have decoded state changes)
      diff.raw.forEach((w) => {
        const oldVal = JSON.stringify(w.original);
        const newVal = JSON.stringify(w.dirty);
        changes.push({ before: oldVal, after: newVal, name: `Slot \`${w.key}\`` });
      });
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
        changes.push({ before: original[k], after: dirty[k], name: k, type: diff.soltype?.name });
      }
    } else {
      // TODO arrays and nested mapping are currently not well supported -- find a transaction
      // that changes state of these types to inspect the Tenderly simulation response and
      // handle it accordingly. In the meantime we show the raw state changes and print a
      // warning about decoding the data
      diff.raw.forEach((w) => {
        const oldVal = JSON.stringify(w.original);
        const newVal = JSON.stringify(w.dirty);
        // info += `\n        - Slot \`${w.key}\` changed from \`${oldVal}\` to \`${newVal}\``
        changes.push({ before: oldVal, after: newVal, name: `Slot \`${w.key}\`` });
        console.log(`Could not parse state: add support for formatting type ${diff.soltype?.type} (slot ${w.key})\n`);
      });
    }
  }
  return changes;
}

async function renderContractChanges(
  simulation: TenderlySimulationResponse,
  client: Client,
  address: Hex,
  changes: Change[]
) {
  let stateChanges = `\n${getContractName(simulation.contracts, address, client.chain!.id)}\n\`\`\`diff\n`;
  for (const change of changes) {
    stateChanges += await deepDiff(client, address, change.before, change.after, change.name, change.type);
  }
  stateChanges += '```\n';

  return stateChanges;
}

function wrapInQuotes(name: string, quotes: boolean) {
  if (quotes) return '`' + name + '`';
  return name;
}

export async function deepDiff(
  client: Client,
  address: Hex,
  before: Record<string, any> | string,
  after: Record<string, any> | string,
  name: string,
  type?: string
): Promise<string> {
  if (typeof before !== 'object' || typeof after !== 'object') {
    return `@@ ${type ? `${wrapInQuotes(type, true)} key ` : ''}${wrapInQuotes(
      name,
      !!type
    )} @@\n- ${await enhanceValue({ client, address, value: before as string, type })}\n+ ${await enhanceValue({
      client,
      address,
      value: after as string,
      type,
    })}\n`;
  }
  let result = '';
  for (const key of Object.keys(before)) {
    if (before[key] === after[key]) continue;
    if (typeof before[key] === 'object')
      result += await deepDiff(client, address, before[key], after[key], name ? `${name}.${key}` : key, type);
    else
      result += `@@ ${type ? `${wrapInQuotes(type, true)} key ` : ''}${wrapInQuotes(
        `${name}.${key}`,
        !!type
      )} @@\n- ${await enhanceValue({
        client,
        address,
        value: before[key],
        type,
        subType: key,
      })}\n+ ${await enhanceValue({
        client,
        address,
        value: after[key],
        type,
        subType: key,
      })}\n`;
  }
  return result;
}

async function enhanceValue({
  client,
  address,
  value,
  type,
  subType,
}: {
  client: Client;
  address: Hex;
  value: string;
  type?: string;
  subType?: string;
}) {
  if (type) {
    // values to be rendered with asset decimals
    if (['_balances', 'balanceOf', 'balances', 'allowed', '_allowances', 'allowance'].includes(type)) {
      const asset = await findAsset(client, address);
      if (asset) return `${formatNumberString(formatUnits(BigInt(value), asset.decimals))}[${value}]`;
    }
    // values to be rendered with ray decimals
    if (subType && ['_reserves'].includes(type) && ['liquidityIndex', 'variableBorrowIndex'].includes(subType)) {
      return `${formatNumberString(formatUnits(BigInt(value), 27))}[${value}]`;
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
      const stateDiffs = simulation.transaction.transaction_info.state_diff.reduce((diffs, diff) => {
        // TODO: double check if that's safe to skip
        if (!diff.raw?.[0]) return diffs;
        const addr = getAddress(diff.raw[0].address);
        if (!diffs[addr]) diffs[addr] = [diff];
        else diffs[addr].push(diff);
        return diffs;
      }, {} as Record<string, StateDiff[]>);

      if (!Object.keys(stateDiffs).length) {
        warnings.push(`No state changes detected`);
      } else {
        let stateChanges = '';
        let warnings = '';
        // Parse state changes at each address
        for (const [address, diffs] of Object.entries(stateDiffs)) {
          const changes = getContractChanges(diffs);
          stateChanges += await renderContractChanges(simulation, client, address as Hex, changes);
        }

        info.push(stateChanges);
      }
    }
    return { info, warnings, errors };
  },
};
