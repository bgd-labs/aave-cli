import type {Client} from 'viem';
import type {TenderlySimulationResponse} from '../utils/tenderlyClient';
import {checkLogs} from './checks/logs';
import {checkTouchedContractsNoSelfdestruct} from './checks/selfDestruct';
import {checkStateChanges} from './checks/state';
import {checkTouchedContractsVerifiedEtherscan} from './checks/targetsVerified';
import {HUMAN_READABLE_STATE} from './governance';
import {renderCheckResult, renderUnixTime, toTxLink} from './utils/markdownUtils';
import {GetProposalReturnType} from '@bgd-labs/aave-v3-governance-cache';

type GenerateReportRequest = {
  proposalId: bigint;
  proposalInfo: GetProposalReturnType;
  simulation: TenderlySimulationResponse;
  client: Client;
  formattedPayloads?: string[];
};

export async function generateProposalReport({
  proposalId,
  proposalInfo,
  simulation,
  client,
  formattedPayloads,
}: GenerateReportRequest) {
  const {
    proposal,
    logs: {executedLog, queuedLog, createdLog, payloadSentLog, votingActivatedLog},
    ipfs,
  } = proposalInfo;
  // generate file header
  let report = `## Proposal ${proposalId}

- Simulation: [https://dashboard.tenderly.co/me/simulator/${
    simulation.simulation.id
  }](https://dashboard.tenderly.co/me/simulator/${simulation.simulation.id})
- state: ${HUMAN_READABLE_STATE[proposal.state as keyof typeof HUMAN_READABLE_STATE]}
- creator: ${proposal.creator}
- maximumAccessLevelRequired: ${proposal.accessLevel}
- payloads: 
  ${
    formattedPayloads
      ? formattedPayloads.map((payload) => `  - ${payload}\n`).join()
      : JSON.stringify(proposal.payloads, (key, value) =>
          typeof value === 'bigint' ? value.toString() : value,
        )
  }
- createdAt: [${renderUnixTime(proposal.creationTime)}](${toTxLink(createdLog.transactionHash, false, client)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${renderUnixTime(proposal.queuingTime)}](${toTxLink(
      queuedLog.transactionHash,
      false,
      client,
    )})\n`;
  }
  if (executedLog) {
    report += `- executedAt: [${renderUnixTime(executedLog.timestamp)}, timestamp: ${executedLog.timestamp}, block: ${executedLog.blockNumber}](${toTxLink(
      executedLog.transactionHash,
      false,
      client,
    )})\n`;
  } else {
    const timestamp = Math.floor(new Date(simulation.transaction.timestamp).getTime() / 1000);
    report += `- simulatedExecutionAt: ${renderUnixTime(
      timestamp,
    )}, timestamp: ${timestamp}, block: ${simulation.transaction.block_number}`;
  }
  report += '\n';

  report += `### Ipfs

<details>
  <summary>${ipfs.title}</summary>
  
  ${ipfs.description}
</details>\n\n`;

  // check if simulation was successful

  const checks = [
    checkStateChanges,
    checkLogs,
    checkTouchedContractsVerifiedEtherscan,
    checkTouchedContractsNoSelfdestruct,
  ];

  for (const check of checks) {
    const result = await check.checkProposal(proposalInfo, simulation, client);
    report += renderCheckResult(check, result);
  }

  return report;
}
