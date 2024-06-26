import type {Client} from 'viem';
import type {TenderlySimulationResponse} from '../utils/tenderlyClient';
import {checkLogs} from './checks/logs';
import {
  checkTargetsNoSelfdestruct,
  checkTouchedContractsNoSelfdestruct,
} from './checks/selfDestruct';
import {checkStateChanges} from './checks/state';
import {
  checkTargetsVerifiedEtherscan,
  checkTouchedContractsVerifiedEtherscan,
} from './checks/targetsVerified';
import {HUMAN_READABLE_PAYLOAD_STATE} from './payloadsController';
import {renderCheckResult, renderUnixTime, toTxLink} from './utils/markdownUtils';
import {GetPayloadReturnType} from '@bgd-labs/aave-v3-governance-cache';

type GenerateReportRequest = {
  payloadId: number;
  payloadInfo: GetPayloadReturnType;
  simulation: TenderlySimulationResponse;
  client: Client;
};

export async function generateReport({
  payloadId,
  payloadInfo,
  simulation,
  client,
}: GenerateReportRequest) {
  const {
    payload,
    logs: {executedLog, queuedLog, createdLog},
  } = payloadInfo;
  // generate file header
  let report = `## Payload ${payloadId} on ${client.chain!.name}

- Simulation: [https://dashboard.tenderly.co/me/simulator/${
    simulation.simulation.id
  }](https://dashboard.tenderly.co/me/simulator/${simulation.simulation.id})
- creator: ${payload.creator}
- maximumAccessLevelRequired: ${payload.maximumAccessLevelRequired}
- state: ${payload.state}(${(HUMAN_READABLE_PAYLOAD_STATE as any)[payload.state]})
- actions: ${JSON.stringify(payload.actions, (key, value) => (typeof value === 'bigint' ? value.toString() : value))}
- createdAt: [${renderUnixTime(payload.createdAt)}](${toTxLink(createdLog.transactionHash, false, client)})\n`;
  if (queuedLog) {
    report += `- queuedAt: [${renderUnixTime(payload.queuedAt)}](${toTxLink(
      queuedLog.transactionHash,
      false,
      client,
    )})\n`;
    if (executedLog) {
      report += `- executedAt: [${renderUnixTime(payload.executedAt)}, timestamp: ${executedLog.timestamp}, block: ${executedLog.blockNumber}](${toTxLink(
        executedLog.transactionHash,
        false,
        client,
      )})\n`;
    } else {
      report += `- earliest execution at: [${renderUnixTime(
        payload.queuedAt + payload.delay,
      )}](https://www.epochconverter.com/countdown?q=${payload.queuedAt + payload.delay})\n`;
      const timestamp = Math.floor(new Date(simulation.transaction.timestamp).getTime() / 1000);
      report += `- simulatedExecutionAt: ${renderUnixTime(
        timestamp,
      )}, timestamp: ${timestamp}, block: ${simulation.transaction.block_number}`;
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
    const result = await check.checkProposal(payloadInfo, simulation, client);
    report += renderCheckResult(check, result);
  }

  return report;
}
