import { Command } from '@commander-js/extra-typings';
import { simulateProposal } from '../govv3/simulate';
import {
  GovernanceV3Goerli,
  IDataWarehouse_ABI,
  IVotingMachineWithProofs_ABI,
  IVotingPortal_ABI,
} from '@bgd-labs/aave-address-book';
import { HUMAN_READABLE_STATE, ProposalState, getGovernance } from '../govv3/governance';
import { CHAIN_ID_CLIENT_MAP, goerliClient } from '../utils/rpcClients';
import { logError, logInfo, logSuccess } from '../utils/logger';
import { Hex, PublicClient, createWalletClient, encodeFunctionData, getContract, http } from 'viem';
import { confirm, input, select } from '@inquirer/prompts';
import { getCachedIpfs } from '../ipfs/getCachedProposalMetaData';
import { toAddressLink, toTxLink } from '../govv3/utils/markdownUtils';
import { getAccountRPL, getBLockRLP } from '../govv3/proofs';

enum DialogOptions {
  DETAILS,
  IPFS_TEXT,
  TRANSACTIONS,
  HOW_TO_VOTE,
  HOW_TO_REGISTER_STORAGE_ROOTS,
  EXIT,
}

const DEFAULT_GOVERNANCE = GovernanceV3Goerli.GOVERNANCE;
const DEFAULT_CLIENT = goerliClient;

export function addCommand(program: Command) {
  const govV3 = program.command('governance').description('interact with governance v3 contracts');

  govV3
    .command('simulate')
    .description('simulates a proposal on tenderly')
    .requiredOption('--proposalId <number>', 'proposalId to simulate via tenderly')
    .action(async (name, options) => {
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      await simulateProposal(DEFAULT_GOVERNANCE, DEFAULT_CLIENT, proposalId);
    });

  govV3
    .command('view')
    .description('shows all the proposals & state')
    .action(async (opts) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
        blockCreated: 9640498n,
      });
      const logs = await governance.cacheLogs();
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
      const { proposal, ...proposalLogs } = await governance.getProposalAndLogs(selectedProposalId, logs);
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
          logInfo('CreatedLog', toTxLink(proposalLogs.createdLog.transactionHash, false, DEFAULT_CLIENT));
          if (proposalLogs.votingActivatedLog)
            logInfo(
              'VotingActicated',
              toTxLink(proposalLogs.votingActivatedLog.transactionHash, false, DEFAULT_CLIENT)
            );
          if (proposalLogs.queuedLog)
            logInfo('QueuedLog', toTxLink(proposalLogs.queuedLog.transactionHash, false, DEFAULT_CLIENT));
          if (proposalLogs.executedLog)
            logInfo('ExecutedLog', toTxLink(proposalLogs.executedLog.transactionHash, false, DEFAULT_CLIENT));
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
              CHAIN_ID_CLIENT_MAP[Number(payload.chain) as keyof typeof CHAIN_ID_CLIENT_MAP].chain.name
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
            publicClient: DEFAULT_CLIENT,
          });
          const [machine, chainId] = await Promise.all([
            portal.read.VOTING_MACHINE(),
            portal.read.VOTING_MACHINE_CHAIN_ID(),
          ]);
          const proofs = await governance.getVotingProofs(selectedProposalId, address, chainId);
          if (proofs.length == 0) logError('Voting Error', 'You need voting power to vote');
          else {
            logInfo(
              'Explorer link',
              toAddressLink(
                machine,
                false,
                CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP] as PublicClient
              )
            );
            logInfo('Method', 'submitVote');
            logInfo('parameter proposalId', selectedProposalId);
            logInfo('parameter support', String(support));
            logInfo(
              'parameter votingBalanceProofs',
              JSON.stringify(proofs.map((p) => [p.underlyingAsset, p.slot.toString(), p.proof]))
            );

            logInfo(
              'encoded calldata',
              encodeFunctionData({
                abi: IVotingMachineWithProofs_ABI,
                functionName: 'submitVote',
                args: [BigInt(selectedProposalId), support, proofs],
              })
            );
          }
        }

        if (moreInfo == DialogOptions.HOW_TO_REGISTER_STORAGE_ROOTS) {
          const portalContract = getContract({
            address: proposal.votingPortal,
            abi: IVotingPortal_ABI,
            publicClient: DEFAULT_CLIENT,
          });
          const [machine, chainId] = await Promise.all([
            portalContract.read.VOTING_MACHINE(),
            portalContract.read.VOTING_MACHINE_CHAIN_ID(),
          ]);
          const machineContract = getContract({
            address: machine,
            abi: IVotingMachineWithProofs_ABI,
            publicClient: CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP] as PublicClient,
          });
          const dataWarehouse = await machineContract.read.DATA_WAREHOUSE();
          const dataWarehouseContracts = getContract({
            address: dataWarehouse,
            abi: IDataWarehouse_ABI,
            publicClient: CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP] as PublicClient,
          });
          const roots = await governance.getStorageRoots(selectedProposalId);
          logInfo(
            'Explorer link',
            toAddressLink(
              dataWarehouse,
              false,
              CHAIN_ID_CLIENT_MAP[Number(chainId) as keyof typeof CHAIN_ID_CLIENT_MAP] as PublicClient
            )
          );
          const block = await DEFAULT_CLIENT.getBlock({ blockHash: proposal.snapshotBlockHash });
          const blockRPL = getBLockRLP(block);
          logInfo('Method', 'processStorageRoot');
          roots.map((root, ix) => {
            logInfo(`account.${ix}`, root.address);
            logInfo(`blockHash.${ix}`, proposal.snapshotBlockHash);
            logInfo(`blockHeaderRPL.${ix}`, blockRPL);
            logInfo(`accountStateProofRPL.${ix}`, getAccountRPL(root.accountProof));
          });
        }
      }
    });

  /**
   *
   */
  govV3
    .command('getWarehouseRoots')
    .description('generate the roots for the warehouse')
    .requiredOption('--proposalId <number>', 'proposalId to generate the proof for')
    .action(async (name, options) => {
      const governance = getGovernance({
        address: DEFAULT_GOVERNANCE,
        publicClient: DEFAULT_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));

      const proofs = await governance.getRoots(proposalId);
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
        publicClient: DEFAULT_CLIENT,
      });
      const proposalId = BigInt(options.getOptionValue('proposalId'));
      const voter = options.getOptionValue('voter') as Hex;

      const proposal = await governance.governanceContract.read.getProposal([proposalId]);

      const portal = getContract({
        address: proposal.votingPortal,
        abi: IVotingPortal_ABI,
        publicClient: DEFAULT_CLIENT,
      });
      const chainId = await portal.read.VOTING_MACHINE_CHAIN_ID();
      const proofs = await governance.getVotingProofs(proposalId, voter as Hex, chainId);
      console.log(proofs); // TODO: format so foundry can consume it
    });
}
