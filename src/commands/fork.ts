import { Command } from '@commander-js/extra-typings';
import { tenderly } from '../utils/tenderlyClient';
import { getGovernance } from '../simulate/govv3/governance';
import { GovernanceV3Ethereum } from '@bgd-labs/aave-address-book';
import { RPC_MAP, mainnetClient } from '../utils/rpcClients';
import { getPayloadsController } from '../simulate/govv3/payloadsController';
import { Hex, PublicClient } from 'viem';

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
        if (options.alias) {
          return `${unix}-${options.alias}`;
        } else if (options.proposalId) {
          return `${unix}-proposalId-${options.proposalId}`;
        } else if (options.payloadId) {
          return `${unix}-payloadAddress-${options.payloadId}`;
        }
        return 'vanilla-fork';
      }

      const forkConfig = {
        chainId: Number(chainId),
        alias: getAlias(),
        blockNumber: Number(blockNumber),
      };
      const governance = getGovernance({ address: GovernanceV3Ethereum.GOVERNANCE, publicClient: mainnetClient });
      if (proposalId) {
        const payload = await governance.getSimulationPayloadForExecution(BigInt(proposalId));
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber || payload.block_number,
        });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
      } else if (payloadId) {
        if (!payloadsControllerAddress) throw new Error('you need to provide a payloadsController');
        const payloadsController = getPayloadsController(
          payloadsControllerAddress as Hex,
          RPC_MAP[forkConfig.chainId as keyof typeof RPC_MAP] as PublicClient
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
