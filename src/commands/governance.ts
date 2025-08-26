import {
  IDataWarehouse_ABI,
  IVotingMachineWithProofs_ABI,
  IVotingPortal_ABI,
} from '@bgd-labs/aave-address-book/abis';
import type {Command} from '@commander-js/extra-typings';
import {confirm, input, select} from '@inquirer/prompts';
import {type Hex, encodeAbiParameters, encodeFunctionData, getContract} from 'viem';
import {HUMAN_READABLE_STATE, getGovernance} from '../govv3/governance';
import {getAccountRPL, getBlockRLP} from '../govv3/proofs';
import {toAddressLink, toTxLink} from '../govv3/utils/markdownUtils';
import {DEFAULT_GOVERNANCE, DEFAULT_GOVERNANCE_CLIENT, FORMAT} from '../utils/constants';
import {logError, logInfo, logSuccess} from '../utils/logger';
import {getBlock} from 'viem/actions';
import {customStorageProvider} from '@bgd-labs/aave-v3-governance-cache/customStorageProvider';
import {fileSystemStorageAdapter} from '@bgd-labs/aave-v3-governance-cache/fileSystemStorageAdapter';

const localCacheAdapter = customStorageProvider(fileSystemStorageAdapter);

import {refreshCache} from '@bgd-labs/aave-v3-governance-cache/refreshCache';
import {ChainList} from '@bgd-labs/toolbox';

enum DialogOptions {
  DETAILS = 0,
  IPFS_TEXT = 1,
  TRANSACTIONS = 2,
  HOW_TO_VOTE = 3,
  HOW_TO_REGISTER_STORAGE_ROOTS = 4,
  EXIT = 5,
}

export function addCommand(program: Command) {
  const govV3 = program.command('governance').description('interact with governance v3 contracts');

  govV3
    .command('view')
    .description('shows all the proposals & state')
    .action(async (opts) => {
      await refreshCache(localCacheAdapter);
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        client: DEFAULT_GOVERNANCE_CLIENT,
      });
      const count = await governance.governanceContract.read.getProposalsCount();
      const proposalIds = [...Array(Number(count)).keys()].reverse();
      const selectedProposalId = BigInt(
        await select({
          message: 'Select a proposal to get more information',
          choices: await Promise.all(
            proposalIds.map(async (id) => {
              const proposalCache = await localCacheAdapter.getProposal({
                chainId: DEFAULT_GOVERNANCE_CLIENT.chain!.id,
                governance: DEFAULT_GOVERNANCE,
                proposalId: BigInt(id),
              });
              const title = `${id} - ${
                HUMAN_READABLE_STATE[
                  proposalCache.proposal.state as keyof typeof HUMAN_READABLE_STATE
                ]
              } | ${proposalCache.ipfs?.title || 'problems fetching ipfs meta'}`;
              return {name: title, value: id};
            }),
          ),
        }),
      );
      const cache = await localCacheAdapter.getProposal({
        chainId: DEFAULT_GOVERNANCE_CLIENT.chain!.id,
        governance: DEFAULT_GOVERNANCE,
        proposalId: selectedProposalId,
      });
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

        if (moreInfo === DialogOptions.EXIT) {
          exitLvl2 = true;
          process.exit(0);
        }

        if (moreInfo === DialogOptions.IPFS_TEXT) {
          logInfo('title', cache.ipfs?.title || 'problem fetching ipfs metadata');
          logInfo('author', cache.ipfs?.author || 'problem fetching ipfs metadata');
          logInfo('discussion', cache.ipfs?.discussions || 'problem fetching ipfs metadata');
          logInfo('description', cache.ipfs?.description || 'problem fetching ipfs metadata');
        }

        if (moreInfo === DialogOptions.TRANSACTIONS) {
          logInfo(
            'CreatedLog',
            toTxLink(cache.logs.createdLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT),
          );
          if (cache.logs.votingActivatedLog)
            logInfo(
              'VotingActivated',
              toTxLink(
                cache.logs.votingActivatedLog.transactionHash,
                false,
                DEFAULT_GOVERNANCE_CLIENT,
              ),
            );
          if (cache.logs.queuedLog)
            logInfo(
              'QueuedLog',
              toTxLink(cache.logs.queuedLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT),
            );
          if (cache.logs.executedLog)
            logInfo(
              'ExecutedLog',
              toTxLink(cache.logs.executedLog.transactionHash, false, DEFAULT_GOVERNANCE_CLIENT),
            );
        }

        if (moreInfo === DialogOptions.DETAILS) {
          logInfo('Creator', cache.proposal.creator);
          logInfo('ForVotes', cache.proposal.forVotes);
          logInfo('AgainstVotes', cache.proposal.againstVotes);
          logInfo('AccessLevel', cache.proposal.accessLevel);
          logInfo('VotingPortal', cache.proposal.votingPortal);
          cache.proposal.payloads.map((payload, ix) => {
            logInfo(`Payload.${ix}.accessLevel`, payload.accessLevel);
            logInfo(`Payload.${ix}.chain`, ChainList[payload.chain as keyof typeof ChainList].name);
            logInfo(`Payload.${ix}.payloadId`, payload.payloadId);
            logInfo(`Payload.${ix}.payloadsController`, payload.payloadsController);
          });
        }

        if (moreInfo === DialogOptions.HOW_TO_VOTE) {
          const address = (await input({
            message: 'Enter the address you would like to vote with',
          })) as Hex;
          const support = await confirm({
            message: 'Are you in Support of the proposal?',
          });
          const portal = getContract({
            address: cache.proposal.votingPortal,
            abi: IVotingPortal_ABI,
            client: DEFAULT_GOVERNANCE_CLIENT,
          });
          const [machine, chainId] = await Promise.all([
            portal.read.VOTING_MACHINE(),
            portal.read.VOTING_MACHINE_CHAIN_ID(),
          ]);
          const proofs = await governance.getVotingProofs(selectedProposalId, address, chainId);
          if (proofs.length === 0) logError('Voting Error', 'You need voting power to vote');
          else {
            logSuccess('VotingMachine', toAddressLink(machine, false, getClient(Number(chainId))));
            if (FORMAT === 'raw') {
              logSuccess('Method', 'submitVote');
              logSuccess('parameter proposalId', selectedProposalId);
              logSuccess('parameter support', String(support));
              logSuccess(
                'parameter votingBalanceProofs',
                JSON.stringify(proofs.map((p) => [p.underlyingAsset, p.slot.toString(), p.proof])),
              );
            } else {
              logSuccess(
                'encoded calldata',
                encodeFunctionData({
                  abi: IVotingMachineWithProofs_ABI,
                  functionName: 'submitVote',
                  args: [selectedProposalId, support, proofs],
                }),
              );
            }
          }
        }

        if (moreInfo === DialogOptions.HOW_TO_REGISTER_STORAGE_ROOTS) {
          const portalContract = getContract({
            address: cache.proposal.votingPortal,
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
            client: getClient(Number(chainId)),
          });
          const dataWarehouse = await machineContract.read.DATA_WAREHOUSE();
          const roots = await governance.getStorageRoots(selectedProposalId);
          logSuccess(
            'DataWarehouse',
            toAddressLink(dataWarehouse, false, getClient(Number(chainId))),
          );
          const block = await getBlock(DEFAULT_GOVERNANCE_CLIENT, {
            blockHash: cache.proposal.snapshotBlockHash,
          });
          const blockRPL = getBlockRLP(block);
          console.log(FORMAT);
          if (FORMAT === 'raw') {
            logSuccess('Method', 'processStorageRoot');
            roots.map((root, ix) => {
              const accountRPL = getAccountRPL(root.accountProof);
              logSuccess(`account.${ix}`, root.address);
              logSuccess(`blockHash.${ix}`, cache.proposal.snapshotBlockHash);
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
                  args: [root.address, cache.proposal.snapshotBlockHash, blockRPL, accountRPL],
                }),
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
      const proposal = await governance.governanceContract.read.getProposal([proposalId]);

      const roots = await governance.getStorageRoots(proposalId);
      const block = await getBlock(DEFAULT_GOVERNANCE_CLIENT, {
        blockHash: proposal.snapshotBlockHash,
      });
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
                {name: 'account', type: 'address'},
                {name: 'blockHash', type: 'bytes32'},
                {name: 'blockHeaderRPL', type: 'bytes'},
                {name: 'accountStateProofRPL', type: 'bytes'},
              ],
            },
          ],
          [params],
        ),
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
                {name: 'underlyingAsset', type: 'address'},
                {name: 'slot', type: 'uint128'},
                {name: 'proof', type: 'bytes'},
              ],
            },
          ],
          [proofs],
        ),
      );
    });
}
