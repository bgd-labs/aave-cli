import { PublicClient } from 'viem';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { HUMAN_READABLE_PAYLOAD_STATE, PayloadsController, getPayloadsController } from './payloadsController';
import { renderCheckResult, renderUnixTime, toTxLink } from './utils/markdownUtils';
import { checkTargetsNoSelfdestruct, checkTouchedContractsNoSelfdestruct } from './checks/selfDestruct';
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
  let report = `## Payload ${payloadId} on ${publicClient.chain!.name}

- Simulation: [https://dashboard.tenderly.co/me/simulator/${
    simulation.simulation.id
  }](https://dashboard.tenderly.co/me/simulator/${simulation.simulation.id})
- creator: ${payload.creator}
- maximumAccessLevelRequired: ${payload.maximumAccessLevelRequired}
- state: ${payload.state}(${(HUMAN_READABLE_PAYLOAD_STATE as any)[payload.state]})
- actions: ${JSON.stringify(payload.actions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
- createdAt: [${renderUnixTime(payload.createdAt)}](${toTxLink(createdLog.transactionHash, false, publicClient)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${renderUnixTime(payload.queuedAt)}](${toTxLink(
      queuedLog.transactionHash,
      false,
      publicClient
    )})\n`;
    if (executedLog) {
      report += `- executedAt: [${renderUnixTime(payload.executedAt)}](${toTxLink(
        executedLog.transactionHash,
        false,
        publicClient
      )})\n`;
    } else {
      report += `- earliest execution at: [${renderUnixTime(
        payload.queuedAt + payload.delay
      )}](https://www.epochconverter.com/countdown?q=${payload.queuedAt + payload.delay})\n`;
    }
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
