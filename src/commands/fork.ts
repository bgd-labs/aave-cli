import { Command } from '@commander-js/extra-typings';
import { tenderly } from '../utils/tenderlyClient';
import { getGovernance } from '../govv3/governance';
import { getPayloadsController } from '../govv3/payloadsController';
import { Hex, PublicClient } from 'viem';
import { DEFAULT_GOVERNANCE, DEFAULT_GOVERNANCE_CLIENT } from '../utils/constants';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';

export function addCommand(program: Command) {
  program
    .command('fork')
    .description('generates a fork (optionally with a proposal executeds')
    .requiredOption('--chainId <number>', 'the chainId to fork offs')
    .option('--blockNumber <number>', 'the blocknumber to fork of (latest if omitted)')
    .option('--alias <string>', 'Set a custom alias')
    .option('--proposalId <number>', 'ProposalId to execute')
    .option('--payloadId <number>', 'PayloadId to execute')
    .option('--payloadsController <string>', 'PayloadsController address')
    .action(async (options) => {
      const {
        chainId,
        blockNumber,
        alias,
        payloadId,
        proposalId,
        payloadsController: payloadsControllerAddress,
      } = options;
      function getAlias() {
        const unix = Math.floor(new Date().getTime() / 1000);
        if (alias) {
          return `${unix}-${alias}`;
        } else if (options.proposalId) {
          return `${unix}-proposalId-${options.proposalId}`;
        } else if (options.payloadId) {
          return `${unix}-payloadId-${options.payloadId}`;
        }
        return 'vanilla-fork';
      }

      const forkConfig = {
        chainId: Number(chainId),
        alias: getAlias(),
        blockNumber: Number(blockNumber),
      };
      const governance = getGovernance({ address: DEFAULT_GOVERNANCE, client: DEFAULT_GOVERNANCE_CLIENT });
      if (proposalId) {
        const payload = await governance.getSimulationPayloadForExecution(BigInt(proposalId));
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber || payload.block_number,
        });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
      } else if (payloadId != undefined) {
        if (!payloadsControllerAddress) throw new Error('you need to provide a payloadsController');
        const payloadsController = getPayloadsController(
          payloadsControllerAddress as Hex,
          CHAIN_ID_CLIENT_MAP[forkConfig.chainId as keyof typeof CHAIN_ID_CLIENT_MAP]
        );
        const payload = await payloadsController.getSimulationPayloadForExecution(Number(payloadId));
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber || payload.block_number,
        });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
      }
    });
}
