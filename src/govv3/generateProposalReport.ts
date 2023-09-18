import { Hex, PublicClient, getAddress } from 'viem';
import { StateDiff, TenderlySimulationResponse } from '../utils/tenderlyClient';
import { tenderlyDeepDiff } from './utils/tenderlyDeepDiff';
import { interpretStateChange } from './utils/stateDiffInterpreter';
import { getContractName } from './utils/solidityUtils';
import { boolToMarkdown, renderCheckResult, toTxLink } from './utils/markdownUtils';
import { checkTouchedContractsNoSelfdestruct } from './checks/selfDestruct';
import { checkLogs } from './checks/logs';
import { checkTouchedContractsVerifiedEtherscan } from './checks/targetsVerified';
import { Governance, HUMAN_READABLE_STATE } from './governance';
import { checkStateChanges } from './checks/state';
import { getProposalMetadata } from '../ipfs/parseIpfs';

type GenerateReportRequest = {
  proposalId: bigint;
  proposalInfo: Awaited<ReturnType<Governance['getProposalAndLogs']>>;
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

  const ipfsMeta = await getProposalMetadata(proposal.ipfsHash, process.env.IPFS_GATEWAY);
  report += `### Ipfs

<details>
  <summary>Proposal text</summary>
  
  ${ipfsMeta.description}
</details>`;

  // check if simulation was successful

  const checks = [
    checkStateChanges,
    checkLogs,
    checkTouchedContractsVerifiedEtherscan,
    checkTouchedContractsNoSelfdestruct,
  ];

  for (const check of checks) {
    const result = await check.checkProposal(proposalInfo, simulation, publicClient);
    report += renderCheckResult(check, result);
  }

  return report;
}
