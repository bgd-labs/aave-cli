import { Command } from '@commander-js/extra-typings';
import { simulateProposal } from '../govv3/simulate';
import { IDataWarehouse_ABI, IVotingMachineWithProofs_ABI, IVotingPortal_ABI } from '@bgd-labs/aave-address-book';
import { HUMAN_READABLE_STATE, getGovernance } from '../govv3/governance';
import { CHAIN_ID_CLIENT_MAP } from '@bgd-labs/js-utils';
import { logError, logInfo, logSuccess } from '../utils/logger';
import { Address, Hex, encodeAbiParameters, encodeFunctionData, getContract } from 'viem';
import { confirm, input, select } from '@inquirer/prompts';
import { getCachedIpfs } from '../ipfs/getCachedProposalMetaData';
import { toAddressLink, toTxLink } from '../govv3/utils/markdownUtils';
import { getAccountRPL, getBlockRLP } from '../govv3/proofs';
import { DEFAULT_GOVERNANCE, DEFAULT_GOVERNANCE_CLIENT, FORMAT } from '../utils/constants';
import { getPayloadsController } from '../govv3/payloadsController';
import {
  cacheGovernance,
  cachePayloadsController,
  readBookKeepingCache,
  writeBookKeepingCache,
} from '../govv3/cache/updateCache';

enum DialogOptions {
  DETAILS,
  IPFS_TEXT,
  TRANSACTIONS,
  HOW_TO_VOTE,
  HOW_TO_REGISTER_STORAGE_ROOTS,
  EXIT,
}

export function addCommand(program: Command) {
  const govV3 = program.command('governance').description('interact with governance v3 contracts');

  govV3
    .command('simulate')
    .description('simulates a proposal on tenderly')
    .requiredOption('--proposalId <number>', 'proposalId to simulate via tenderly')
    .action(async (name, options) => {
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      await simulateProposal(DEFAULT_GOVERNANCE, DEFAULT_GOVERNANCE_CLIENT, proposalId);
    });

  govV3
    .command('simulate-payload')
    .description('simulates a payloadId on tenderly')
    .requiredOption('--chainId <number>', 'the chainId to fork of')
    .requiredOption('--payloadId <number>', 'payloadId to simulate via tenderly')
    .option('--payloadsController <string>', 'PayloadsController address')
    .action(async ({ payloadId: _payloadId, payloadsController: payloadsControllerAddress, chainId }, options) => {
      const payloadId = Number(_payloadId);
      const client = CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP];
      const payloadsController = getPayloadsController(payloadsControllerAddress as Hex, client);
      const cache = readBookKeepingCache();
      const { eventsCache } = await cachePayloadsController(client, payloadsControllerAddress as Address, cache);
      writeBookKeepingCache(cache);
      const config = await payloadsController.getPayload(payloadId, eventsCache);
      await payloadsController.simulatePayloadExecutionOnTenderly(Number(payloadId), config);
    });

  govV3
    .command('view')
    .description('shows all the proposals & state')
    .action(async (opts) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        client: DEFAULT_GOVERNANCE_CLIENT,
        blockCreated: 9640498n,
      });
      const cache = readBookKeepingCache();
      const { eventsCache } = await cacheGovernance(DEFAULT_GOVERNANCE_CLIENT, DEFAULT_GOVERNANCE, cache);
      writeBookKeepingCache(cache);
      const count = await governance.governanceContract.read.getProposalsCount();
      const proposalIds = [...Array(Number(count)).keys()].reverse();
      const selectedProposalId = BigInt(
        await select({
          message: 'Select a proposal to get more information',
          choices: await Promise.all(
            proposalIds.map(async (id) => {
              const proposal = await governance.getProposal(BigInt(id));
              const ipfs = await getCachedIpfs(proposal.ipfsHash);
              const title = `${id} - ${HUMAN_READABLE_STATE[proposal.state as keyof typeof HUMAN_READABLE_STATE]} | ${
                ipfs.title
              }`;
              return { name: title, value: id };
            })
          ),
        })
      );
      const { proposal, ...proposalLogs } = await governance.getProposalAndLogs(selectedProposalId, eventsCache);
      let exitLvl2 = false;
      while (!exitLvl2) {
        const moreInfo = await select({
          message: 'What do you want to do?',
          choices: [
            {
              name: 'Show details',
              value: DialogOptions.DETAILS,
            },
            {
              name: 'Show ipfs details',
              value: DialogOptions.IPFS_TEXT,
            },
            {
              name: 'Show transactions',
              value: DialogOptions.TRANSACTIONS,
            },
            {
              name: 'Show me How to vote',
              value: DialogOptions.HOW_TO_VOTE,
            },
            {
              name: 'Show me How to register storage roots',
              value: DialogOptions.HOW_TO_REGISTER_STORAGE_ROOTS,
            },
            {
              name: 'Exit',
              value: DialogOptions.EXIT,
            },
          ],
        });

        if (moreInfo == DialogOptions.EXIT) {
          exitLvl2 = true;
        }

        if (moreInfo == DialogOptions.IPFS_TEXT) {
          const ipfs = await getCachedIpfs(proposal.ipfsHash);
          logInfo('title', ipfs.title);
          logInfo('author', ipfs.author);
          logInfo('discussion', ipfs.discussions);
          logInfo('description', ipfs.description);
        }

        if (moreInfo == DialogOptions.TRANSACTIONS) {
          logInfo('CreatedLog', toTxLink(proposalLogs.createdLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT));
          if (proposalLogs.votingActivatedLog)
            logInfo(
              'VotingActicated',
              toTxLink(proposalLogs.votingActivatedLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT)
            );
          if (proposalLogs.queuedLog)
            logInfo('QueuedLog', toTxLink(proposalLogs.queuedLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT));
          if (proposalLogs.executedLog)
            logInfo(
              'ExecutedLog',
              toTxLink(proposalLogs.executedLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT)
            );
        }

        if (moreInfo == DialogOptions.DETAILS) {
          logInfo('Creator', proposal.creator);
          logInfo('ForVotes', proposal.forVotes);
          logInfo('AgainstVotes', proposal.againstVotes);
          logInfo('AccessLevel', proposal.accessLevel);
          logInfo('VotingPortal', proposal.votingPortal);
          proposal.payloads.map((payload, ix) => {
            logInfo(`Payload.${ix}.accessLevel`, payload.accessLevel);
            logInfo(
              `Payload.${ix}.chain`,
              CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP].chain!.name
            );
            logInfo(`Payload.${ix}.payloadId`, payload.payloadId);
            logInfo(`Payload.${ix}.payloadsController`, payload.payloadsController);
          });
        }

        if (moreInfo == DialogOptions.HOW_TO_VOTE) {
          const address = (await input({
            message: 'Enter the address you would like to vote with',
          })) as Hex;
          const support = await confirm({ message: 'Are you in Support of the proposal?' });
          const portal = getContract({
            address: proposal.votingPortal,
            abi: IVotingPortal_ABI,
            client: DEFAULT_GOVERNANCE_CLIENT,
          });
          const [machine, chainId] = await Promise.all([
            portal.read.VOTING_MACHINE(),
            portal.read.VOTING_MACHINE_CHAIN_ID(),
          ]);
          const proofs = await governance.getVotingProofs(selectedProposalId, address, chainId);
          if (proofs.length == 0) logError('Voting Error', 'You need voting power to vote');
          else {
            logSuccess(
              'VotingMachine',
              toAddressLink(machine, false, CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP])
            );
            if (FORMAT === 'raw') {
              logSuccess('Method', 'submitVote');
              logSuccess('parameter proposalId', selectedProposalId);
              logSuccess('parameter support', String(support));
              logSuccess(
                'parameter votingBalanceProofs',
                JSON.stringify(proofs.map((p) => [p.underlyingAsset, p.slot.toString(), p.proof]))
              );
            } else {
              logSuccess(
                'encoded calldata',
                encodeFunctionData({
                  abi: IVotingMachineWithProofs_ABI,
                  functionName: 'submitVote',
                  args: [selectedProposalId, support, proofs],
                })
              );
            }
          }
        }

        if (moreInfo == DialogOptions.HOW_TO_REGISTER_STORAGE_ROOTS) {
          const portalContract = getContract({
            address: proposal.votingPortal,
            abi: IVotingPortal_ABI,
            client: DEFAULT_GOVERNANCE_CLIENT,
          });
          const [machine, chainId] = await Promise.all([
            portalContract.read.VOTING_MACHINE(),
            portalContract.read.VOTING_MACHINE_CHAIN_ID(),
          ]);
          const machineContract = getContract({
            address: machine,
            abi: IVotingMachineWithProofs_ABI,
            client: CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP],
          });
          const dataWarehouse = await machineContract.read.DATA_WAREHOUSE();
          const roots = await governance.getStorageRoots(selectedProposalId);
          logSuccess(
            'DataWarehouse',
            toAddressLink(
              dataWarehouse,
              false,
              CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP]
            )
          );
          const block = await DEFAULT_GOVERNANCE_CLIENT.getBlock({ blockHash: proposal.snapshotBlockHash });
          const blockRPL = getBlockRLP(block);
          console.log(FORMAT);
          if (FORMAT === 'raw') {
            logSuccess('Method', 'processStorageRoot');
            roots.map((root, ix) => {
              const accountRPL = getAccountRPL(root.accountProof);
              logSuccess(`account.${ix}`, root.address);
              logSuccess(`blockHash.${ix}`, proposal.snapshotBlockHash);
              logSuccess(`blockHeaderRPL.${ix}`, blockRPL);
              logSuccess(`accountStateProofRPL.${ix}`, accountRPL);
            });
          } else {
            roots.map((root, ix) => {
              const accountRPL = getAccountRPL(root.accountProof);
              logSuccess(
                'Encoded callData',
                encodeFunctionData({
                  abi: IDataWarehouse_ABI,
                  functionName: 'processStorageRoot',
                  args: [root.address, proposal.snapshotBlockHash, blockRPL, accountRPL],
                })
              );
            });
          }
        }
      }
    });

  /**
   *
   */
  govV3
    .command('getStorageRoots')
    .description('generate the storage roots for the warehouse')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        client: DEFAULT_GOVERNANCE_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      const proposal = await governance.getProposal(proposalId);

      const roots = await governance.getStorageRoots(proposalId);
      const block = await DEFAULT_GOVERNANCE_CLIENT.getBlock({ blockHash: proposal.snapshotBlockHash });
      const blockRPL = getBlockRLP(block);
      const params = roots.map((root) => {
        const accountRPL = getAccountRPL(root.accountProof);
        return {
          account: root.address,
          blockHash: proposal.snapshotBlockHash,
          blockHeaderRPL: blockRPL,
          accountStateProofRPL: accountRPL,
        };
      });

      console.log(
        encodeAbiParameters(
          [
            {
              name: 'params',
              type: 'tuple[]',
              components: [
                { name: 'account', type: 'address' },
                { name: 'blockHash', type: 'bytes32' },
                { name: 'blockHeaderRPL', type: 'bytes' },
                { name: 'accountStateProofRPL', type: 'bytes' },
              ],
            },
          ],
          [params]
        )
      );
    });

  /**
   *
   */
  govV3
    .command('getVotingProofs')
    .description('generates the proofs for voting')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .requiredOption('--voter <string>', 'the address to vote')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        client: DEFAULT_GOVERNANCE_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      const voter = options.getOptionValue('voter') as Hex;

      const proposal = await governance.governanceContract.read.getProposal([proposalId]);

      const portal = getContract({
        address: proposal.votingPortal,
        abi: IVotingPortal_ABI,
        client: DEFAULT_GOVERNANCE_CLIENT,
      });
      const chainId = await portal.read.VOTING_MACHINE_CHAIN_ID();
      const proofs = await governance.getVotingProofs(proposalId, voter as Hex, chainId);
      console.log(
        encodeAbiParameters(
          [
            {
              name: 'proofs',
              type: 'tuple[]',
              components: [
                { name: 'underlyingAsset', type: 'address' },
                { name: 'slot', type: 'uint128' },
                { name: 'proof', type: 'bytes' },
              ],
            },
          ],
          [proofs]
        )
      );
    });
}
