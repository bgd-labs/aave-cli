import { logInfo } from '../utils/logger';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { arbitrum } from './networks/arbitrum';
import { mainnet } from './networks/mainnet';
import { optimism } from './networks/optimism';
import { polygon } from './networks/polygon';

const l2Modules = [arbitrum, polygon, optimism];

export async function simulateProposal(proposalId: bigint) {
  logInfo(mainnet.name, 'Updating events cache');
  const mainnetCache = await mainnet.cacheLogs();

  logInfo(mainnet.name, 'Fetching latest known proposal state');
  const mainnetState = await mainnet.getProposalState({
    ...mainnetCache,
    proposalId,
  });

  logInfo(mainnet.name, 'Simulate on tenderly');
  const mainnetSimulationResult = await mainnet.simulateOnTenderly({
    ...mainnetState,
    proposalId,
  });
  const subResults: {
    name: string;
    simulation: TenderlySimulationResponse;
  }[] = [];
  for (const module of l2Modules) {
    logInfo(module.name, 'Updating events cache');
    const moduleBridgeTraces = await module.findBridgeInMainnetCalls(
      mainnetSimulationResult.transaction?.transaction_info.call_trace.calls
    );

    if (moduleBridgeTraces.length > 0) {
      logInfo(module.name, `Found ${moduleBridgeTraces.length} bridge messages in mainnet trace`);

      logInfo(module.name, 'Updating events cache');
      const moduleCache = await module.cacheLogs();

      for (const trace of moduleBridgeTraces) {
        logInfo(module.name, 'Fetching latest known proposal state');
        const moduleState = await module.getProposalState({
          trace: trace,
          ...moduleCache,
        } as any);
        if (module.simulateOnTenderly) {
          logInfo(module.name, 'Simulate on tenderly');
          const simulationResult = await module.simulateOnTenderly({
            trace: trace,
            ...moduleState,
          } as any);
          subResults.push({ name: module.name, simulation: simulationResult });
        } else {
          logInfo(module.name, 'Simulation on tenderly not supported');
        }
      }
    } else {
      logInfo(module.name, 'Did not find bridge messages in mainnet trace');
    }
  }
  return { simulation: mainnetSimulationResult, subSimulations: subResults };
}
