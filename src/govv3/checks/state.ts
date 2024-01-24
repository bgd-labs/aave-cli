// Based on https://github.com/Uniswap/governance-seatbelt/blob/main/checks/check-state-changes.ts
// adjusted for viem & aave governance v3
import { Address, Hex, getAddress } from 'viem';
import { ProposalCheck } from './types';
import { getContractName } from '../utils/solidityUtils';
import { StateDiff } from '../../utils/tenderlyClient';
import { tenderlyDeepDiff } from '../utils/tenderlyDeepDiff';
import { interpretStateChange } from '../utils/stateDiffInterpreter';

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
          // Use contracts array to get contract name of address
          stateChanges += `\n${getContractName(
            simulation.contracts,
            address as Address,
            client.chain!.id
          )}\n\`\`\`diff\n`;

          // Parse each diff. A single diff may involve multiple storage changes, e.g. a proposal that
          // executes three transactions will show three state changes to the `queuedTransactions`
          // mapping within a single `diff` element. We always JSON.stringify the values so structs
          // (i.e. tuples) don't print as [object Object]
          for (const diff of diffs) {
            if (!diff.soltype) {
              // In this branch, state change is not decoded, so return raw data of each storage write
              // (all other branches have decoded state changes)
              diff.raw.forEach((w) => {
                const oldVal = JSON.stringify(w.original);
                const newVal = JSON.stringify(w.dirty);
                // info += `\n        - Slot \`${w.key}\` changed from \`${oldVal}\` to \`${newVal}\``
                stateChanges += tenderlyDeepDiff(oldVal, newVal, `Slot \`${w.key}\``);
              });
            } else if (diff.soltype.simple_type) {
              // This is a simple type with a single changed value
              // const oldVal = JSON.parse(JSON.stringify(diff.original))
              // const newVal = JSON.parse(JSON.stringify(diff.dirty))
              // info += `\n        - \`${diff.soltype.name}\` changed from \`${oldVal}\` to \`${newVal}\``
              stateChanges += tenderlyDeepDiff(diff.original, diff.dirty, diff.soltype.name);
            } else if (diff.soltype.type.startsWith('mapping')) {
              // This is a complex type like a mapping, which may have multiple changes. The diff.original
              // and diff.dirty fields can be strings or objects, and for complex types they are objects,
              // so we cast them as such
              const keys = Object.keys(diff.original);
              const original = diff.original as Record<string, any>;
              const dirty = diff.dirty as Record<string, any>;
              for (const k of keys as Hex[]) {
                stateChanges += tenderlyDeepDiff(original[k], dirty[k], `\`${diff.soltype?.name}\` key \`${k}\``);
                const interpretation = await interpretStateChange(
                  address,
                  diff.soltype?.name,
                  original[k],
                  dirty[k],
                  k,
                  client
                );
                if (interpretation) stateChanges += `\n${interpretation}`;
                stateChanges += '\n';
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
                stateChanges += tenderlyDeepDiff(oldVal, newVal, `Slot \`${w.key}\``);
                warnings += `Could not parse state: add support for formatting type ${diff.soltype?.type} (slot ${w.key})\n`;
              });
            }
          }
          stateChanges += '```\n';
        }

        info.push(stateChanges);
      }
    }
    return { info, warnings, errors };
  },
};
