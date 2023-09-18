import { Hex, PublicClient, getAddress } from 'viem';
import { StateDiff, TenderlySimulationResponse } from '../utils/tenderlyClient';
import { PayloadsController } from './payloadsController';
import { tenderlyDeepDiff } from './utils/tenderlyDeepDiff';
import { interpretStateChange } from './utils/stateDiffInterpreter';
import { getContractName } from './utils/solidityUtils';
import { boolToMarkdown, renderCheckResult, toTxLink } from './utils/markdownUtils';
import { checkTargetsNoSelfdestruct, checkTouchedContractsNoSelfdestruct } from './checks/selfDestruct';
import { CheckResult, ProposalCheck } from './checks/types';
import { checkLogs } from './checks/logs';
import { checkTargetsVerifiedEtherscan, checkTouchedContractsVerifiedEtherscan } from './checks/targetsVerified';
import { checkStateChanges } from './checks/state';

type GenerateReportRequest = {
  payloadId: number;
  payloadInfo: Awaited<ReturnType<PayloadsController['getPayload']>>;
  simulation: TenderlySimulationResponse;
  publicClient: PublicClient;
};

export async function generateReport({ payloadId, payloadInfo, simulation, publicClient }: GenerateReportRequest) {
  const { payload, executedLog, queuedLog, createdLog } = payloadInfo;
  // generate file header
  let report = `## Payload ${payloadId} on ${simulation.simulation.network_id}

- creator: ${payload.creator}
- maximumAccessLevelRequired: ${payload.maximumAccessLevelRequired}
- state: ${payload.state}
- actions: ${JSON.stringify(payload.actions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
- createdAt: [${payload.createdAt}](${toTxLink(createdLog.transactionHash, false, publicClient)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${payload.queuedAt}](${toTxLink(queuedLog.transactionHash, false, publicClient)})\n`;
  }
  if (executedLog) {
    report += `- executedAt: [${payload.executedAt}](${toTxLink(executedLog.transactionHash, false, publicClient)})\n`;
  }
  report += '\n';

  const checks = [
    checkStateChanges,
    checkLogs,
    checkTargetsVerifiedEtherscan,
    checkTouchedContractsVerifiedEtherscan,
    checkTargetsNoSelfdestruct,
    checkTouchedContractsNoSelfdestruct,
  ];

  for (const check of checks) {
    const result = await check.checkProposal(payloadInfo, simulation, publicClient);
    report += renderCheckResult(check, result);
  }

  return report;
}
