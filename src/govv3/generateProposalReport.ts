import { Client } from 'viem';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { renderCheckResult, renderUnixTime, toTxLink } from './utils/markdownUtils';
import { checkTouchedContractsNoSelfdestruct } from './checks/selfDestruct';
import { checkLogs } from './checks/logs';
import { checkTouchedContractsVerifiedEtherscan } from './checks/targetsVerified';
import { Governance, HUMAN_READABLE_STATE } from './governance';
import { checkStateChanges } from './checks/state';
import { getCachedIpfs } from '../ipfs/getCachedProposalMetaData';

type GenerateReportRequest = {
  proposalId: bigint;
  proposalInfo: Awaited<ReturnType<Governance['getProposalAndLogs']>>;
  simulation: TenderlySimulationResponse;
  client: Client;
};

export async function generateProposalReport({ proposalId, proposalInfo, simulation, client }: GenerateReportRequest) {
  const { proposal, executedLog, queuedLog, createdLog, payloadSentLog, votingActivatedLog } = proposalInfo;
  // generate file header
  let report = `## Proposal ${proposalId}

- Simulation: [https://dashboard.tenderly.co/me/simulator/${
    simulation.simulation.id
  }](https://dashboard.tenderly.co/me/simulator/${simulation.simulation.id})
- state: ${HUMAN_READABLE_STATE[proposal.state as keyof typeof HUMAN_READABLE_STATE]}
- creator: ${proposal.creator}
- maximumAccessLevelRequired: ${proposal.accessLevel}
- payloads: ${JSON.stringify(proposal.payloads, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
- createdAt: [${renderUnixTime(proposal.creationTime)}](${toTxLink(createdLog.transactionHash, false, client)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${renderUnixTime(proposal.queuingTime)}](${toTxLink(
      queuedLog.transactionHash,
      false,
      client
    )})\n`;
  }
  if (executedLog) {
    report += `- executedAt: [${renderUnixTime(executedLog.timestamp)}](${toTxLink(
      executedLog.transactionHash,
      false,
      client
    )})\n`;
  }
  report += '\n';

  const ipfsMeta = await getCachedIpfs(proposal.ipfsHash);
  report += `### Ipfs

<details>
  <summary>Proposal text</summary>
  
  ${ipfsMeta.description}
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
