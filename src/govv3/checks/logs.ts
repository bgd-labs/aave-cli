// Based on https://github.com/Uniswap/governance-seatbelt/blob/main/checks/check-logs.ts
// adjusted for viem & aave governance v3
import { Address, getAddress } from 'viem';
import { ProposalCheck } from './types';
import { Log } from '../../utils/tenderlyClient';
import { getContractName } from '../utils/solidityUtils';
import { interpretLog } from '../utils/logInterpreter';

/**
 * Reports all emitted events from the proposal
 */
export const checkLogs: ProposalCheck<any> = {
  name: 'Reports all events emitted from the proposal',
  async checkProposal(proposal, sim, client) {
    let info = [];
    const events = sim.transaction.transaction_info.logs?.reduce((logs, log) => {
      const addr = getAddress(log.raw.address);
      if (!logs[addr]) logs[addr] = [log];
      else logs[addr].push(log);
      return logs;
    }, {} as Record<Address, Log[]>);

    // Return if no events to show
    if (!events || !Object.keys(events).length) return { info: ['No events emitted'], warnings: [], errors: [] };

    // Parse each event
    for (const [address, logs] of Object.entries(events)) {
      // Use contracts array to get contract name of address
      info.push(`- ${getContractName(sim.contracts, address as Address, client.chain!.id)}`);

      // Format log data for report
      for (const log of logs) {
        if (Boolean(log.name)) {
          info.push(await interpretLog(client, address as Address, log.name, log.inputs));
        } else {
          // Log is not decoded, report the raw data
          // TODO find a transaction with undecoded logs to know how topics/data are formatted in simulation response
          info.push(`  - Undecoded log: \`${JSON.stringify(log)}\``);
        }
      }
    }

    return { info, warnings: [], errors: [] };
  },
};
