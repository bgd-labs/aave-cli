import { Command } from '@commander-js/extra-typings';
import { tenderly } from '../utils/tenderlyClient';
import { getGovernance } from '../govv3/governance';
import { getPayloadsController } from '../govv3/payloadsController';
import { Hex, createWalletClient, getContract, http } from 'viem';
import { DEFAULT_GOVERNANCE, DEFAULT_GOVERNANCE_CLIENT, EOA } from '../utils/constants';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';
import { findPayloadsController } from '../govv3/utils/checkAddress';
import path from 'path';
import { IPayloadsControllerCore_ABI } from '@bgd-labs/aave-address-book';
import { getTransactionReceipt } from 'viem/actions';

export function addCommand(program: Command) {
  program
    .command('fork')
    .description('generates a fork (optionally with a proposal executeds')
    .requiredOption('--chainId <number>', 'the chainId to fork offs')
    .option('--blockNumber <number>', 'the blocknumber to fork of (latest if omitted)')
    .option('--alias <string>', 'Set a custom alias')
    .option('--proposalId <number>', 'ProposalId to execute')
    .option('--payloadId <number>', 'PayloadId to execute')
    .option('--payloadAddress <string>', 'Payload address')
    .option('--artifactPath <string>', 'path to the local payload')
    .action(async (options) => {
      const { chainId, blockNumber, alias, payloadId, proposalId, artifactPath, payloadAddress } = options;
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
      if (proposalId) {
        const governance = getGovernance({ address: DEFAULT_GOVERNANCE, client: DEFAULT_GOVERNANCE_CLIENT });
        const payload = await governance.getSimulationPayloadForExecution(BigInt(proposalId));
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber || payload.block_number,
        });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
        return;
      }
      const payloadsControllerAddress = findPayloadsController(forkConfig.chainId);
      if (!payloadsControllerAddress) throw new Error('payloadscontroller not found on specified chain');

      if (artifactPath) {
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber,
        });
        const payload = await tenderly.deployCode(fork, path.join(process.cwd(), artifactPath!));
        const walletProvider = createWalletClient({
          account: EOA,
          chain: { id: fork.forkNetworkId, name: 'tenderly' } as any,
          transport: http(fork.forkUrl),
        });
        const payloadsController = getPayloadsController(payloadsControllerAddress as Hex, walletProvider);
        await payloadsController.controllerContract.write.createPayload(
          [
            [
              {
                target: payload,
                withDelegateCall: true,
                accessLevel: 1,
                value: 0n,
                signature: 'execute()',
                callData: '0x0',
              },
            ],
          ],
          {} as any
        );
        const tenderlyPayload = await payloadsController.getSimulationPayloadForExecution(
          Number((await payloadsController.controllerContract.read.getPayloadsCount()) - 1)
        );
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, tenderlyPayload);
        return;
      }
      if (payloadId) {
        const payloadsController = getPayloadsController(
          payloadsControllerAddress as Hex,
          CHAIN_ID_CLIENT_MAP[chainId]
        );
        const payload = await payloadsController.getSimulationPayloadForExecution(Number(payloadId));
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber || payload.block_number,
        });
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, payload);
        return;
      }
      if (payloadAddress) {
        const fork = await tenderly.fork({
          ...forkConfig,
          blockNumber: forkConfig.blockNumber,
        });
        const walletProvider = createWalletClient({
          account: EOA,
          chain: { id: fork.forkNetworkId, name: 'tenderly' } as any,
          transport: http(fork.forkUrl),
        });
        const payloadsController = getPayloadsController(payloadsControllerAddress as Hex, walletProvider);
        await payloadsController.controllerContract.write.createPayload(
          [
            [
              {
                target: payloadAddress as Hex,
                withDelegateCall: true,
                accessLevel: 1,
                value: 0n,
                signature: 'execute()',
                callData: '0x0',
              },
            ],
          ],
          {} as any
        );
        const tenderlyPayload = await payloadsController.getSimulationPayloadForExecution(
          Number((await payloadsController.controllerContract.read.getPayloadsCount()) - 1)
        );
        await tenderly.unwrapAndExecuteSimulationPayloadOnFork(fork, tenderlyPayload);
      }
    });
}
