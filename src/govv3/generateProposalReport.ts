import { Hex, PublicClient, getAddress } from 'viem';
import { StateDiff, TenderlySimulationResponse } from '../utils/tenderlyClient';
import { tenderlyDeepDiff } from './utils/tenderlyDeepDiff';
import { interpretStateChange } from './utils/stateDiffInterpreter';
import { getContractName } from './utils/solidityUtils';
import { boolToMarkdown, renderCheckResult, toTxLink } from './utils/markdownUtils';
import { checkTouchedContractsNoSelfdestruct } from './checks/selfDestruct';
import { checkLogs } from './checks/logs';
import { checkTouchedContractsVerifiedEtherscan } from './checks/targets-verified';
import { Governance, HUMAN_READABLE_STATE } from './governance';

type GenerateReportRequest = {
  proposalId: bigint;
  proposalInfo: Awaited<ReturnType<Governance['getProposal']>>;
  simulation: TenderlySimulationResponse;
  publicClient: PublicClient;
};

export async function generateProposalReport({
  proposalId,
  proposalInfo,
  simulation,
  publicClient,
}: GenerateReportRequest) {
  const { proposal, executedLog, queuedLog, createdLog, payloadSentLog, votingActivatedLog } = proposalInfo;
  // generate file header
  let report = `## Proposal ${proposalId}

- state: ${HUMAN_READABLE_STATE[proposal.state as keyof typeof HUMAN_READABLE_STATE]}
- creator: ${proposal.creator}
- maximumAccessLevelRequired: ${proposal.accessLevel}
- payloads: ${JSON.stringify(proposal.payloads, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
- createdAt: [${proposal.creationTime}](${toTxLink(createdLog.transactionHash, false, publicClient)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${proposal.queuingTime}](${toTxLink(queuedLog.transactionHash, false, publicClient)})\n`;
  }
  if (executedLog) {
    report += `- executedAt: [${executedLog.timestamp}](${toTxLink(
      executedLog.transactionHash,
      false,
      publicClient
    )})\n`;
  }
  report += '\n';

  // check if simulation was successful
  report += `### Simulation ${boolToMarkdown(simulation.transaction.status)}\n\n`;
  if (!simulation.transaction.status) {
    const txInfo = simulation.transaction.transaction_info;
    const reason = txInfo.stack_trace ? txInfo.stack_trace[0].error_reason : 'unknown error';
    report += `Transaction reverted with reason: ${reason}`;
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
      report += `No state changes detected`;
    } else {
      let stateChanges = '';
      let warnings = '';
      // Parse state changes at each address
      for (const [address, diffs] of Object.entries(stateDiffs)) {
        // Use contracts array to get contract name of address
        stateChanges += `\n\`\`\`diff\n# ${getContractName(simulation.contracts, address)}\n`;

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
                publicClient
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

      if (warnings) {
        report += `#### Warnings\n`;
        report += warnings;
      }
      report += `#### State Changes\n`;
      report += stateChanges;
    }
  }
  const checks = [checkLogs, checkTouchedContractsVerifiedEtherscan, checkTouchedContractsNoSelfdestruct];

  for (const check of checks) {
    const result = await check.checkProposal(proposalInfo, simulation, publicClient);
    report += renderCheckResult(check, result);
  }

  return report;
}
