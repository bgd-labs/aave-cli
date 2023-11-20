import { logError, logInfo, logSuccess } from '../utils/logger';
import { TenderlySimulationResponse } from '../utils/tenderlyClient';
import { arbitrum } from './networks/arbitrum';
import { arc, mainnet } from './networks/mainnet';
import { optimism } from './networks/optimism';
import { polygon } from './networks/polygon';
import { base } from './networks/base';
import { ActionSetState, FormattedArgs } from './networks/types';

const l2Modules = [arbitrum, polygon, optimism, arc, base];

export async function simulateProposal(proposalId: bigint) {
  logInfo(mainnet.name, 'Updating events cache');
  const mainnetCache = await mainnet.cacheLogs();

  logInfo(mainnet.name, 'Fetching latest known proposal state');
  const mainnetState = await mainnet.getProposalState({
    ...mainnetCache,
    proposalId,
  });

  logInfo(mainnet.name, 'Simulate on tenderly');
  const { proposal, simulation: mainnetSimulationResult } = await mainnet.simulateOnTenderly({
    ...mainnetState,
    proposalId,
  });
  const subResults: {
    name: string;
    simulation: TenderlySimulationResponse;
    state: ActionSetState;
    args: FormattedArgs;
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
        // any casts needed as types are slightly different on polygon vs others
        try {
          const moduleState = await module.getProposalState({
            trace: trace,
            fromTimestamp: mainnetState.log.timestamp,
            ...moduleCache,
          } as any);
          if (module.simulateOnTenderly) {
            logInfo(module.name, 'Simulate on tenderly');
            const simulation = await module.simulateOnTenderly(moduleState as any);
            logSuccess(module.name, 'Simulation finished');
            subResults.push({ name: module.name, simulation, state: moduleState.state, args: moduleState.args });
          } else {
            logError(module.name, 'Simulation on tenderly not supported');
            subResults.push({
              name: module.name,
              simulation: {
                transaction: {
                  status: false,
                  transaction_info: { stack_trace: [{ error_reason: 'could not decode governancev2 style message' }] },
                },
              } as any,
              state: moduleState.state,
              args: moduleState.args,
            });
          }
        } catch (e) {
          logError(module.name, 'Could not decode bridged message');
        }
      }
    } else {
      logInfo(module.name, 'Did not find bridge messages in mainnet trace');
    }
  }
  return { proposal, simulation: mainnetSimulationResult, subSimulations: subResults };
}
