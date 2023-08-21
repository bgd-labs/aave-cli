import { AaveGovernanceV2 } from '@bgd-labs/aave-address-book';
import { ActionSetState, L2NetworkModule, MainnetModule, ProposalState } from './types';
import {
  concat,
  encodeAbiParameters,
  encodeFunctionData,
  fromHex,
  getContract,
  keccak256,
  pad,
  parseAbiParameters,
  parseEther,
  toHex,
} from 'viem';
import { mainnetClient } from '../../../utils/rpcClients';
import { getLogs } from '../../../utils/logs';
import { Trace, tenderly } from '../../../utils/tenderlyClient';
import { EOA } from '../../../utils/constants';
import {
  AAVE_GOVERNANCE_V2_ABI,
  AAVE_GOVERNANCE_V2_START_BLOCK,
  getAaveGovernanceV2Slots,
} from '../abis/AaveGovernanceV2';
import { EXECUTOR_ABI } from '../abis/Executor';
import { getSolidityStorageSlotBytes } from '../../../utils/storageSlots';
import { ARC_TIMELOCK_ABI } from '../abis/ArcTimelock';
import { getProposalState, simulateNewActionSet, simulateQueuedActionSet } from './commonL2';

const aaveGovernanceV2Contract = getContract({
  address: AaveGovernanceV2.GOV,
  abi: AAVE_GOVERNANCE_V2_ABI,
  publicClient: mainnetClient,
});

export const mainnet: MainnetModule = {
  name: 'Mainnet',
  async cacheLogs() {
    const createdLogs = await getLogs(mainnetClient, (fromBlock, toBlock) =>
      aaveGovernanceV2Contract.createEventFilter.ProposalCreated(
        {},
        {
          fromBlock: fromBlock || AAVE_GOVERNANCE_V2_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const queuedLogs = await getLogs(mainnetClient, (fromBlock, toBlock) =>
      aaveGovernanceV2Contract.createEventFilter.ProposalQueued(
        {},
        {
          fromBlock: fromBlock || AAVE_GOVERNANCE_V2_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const executedLogs = await getLogs(mainnetClient, (fromBlock, toBlock) =>
      aaveGovernanceV2Contract.createEventFilter.ProposalExecuted(
        {},
        {
          fromBlock: fromBlock || AAVE_GOVERNANCE_V2_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );

    return { queuedLogs, executedLogs, createdLogs };
  },
  getProposalState({ proposalId, createdLogs, queuedLogs, executedLogs }) {
    const executedLog = executedLogs.find((log) => log.args.id == proposalId);
    if (executedLog) return { log: executedLog, state: ProposalState.EXECUTED };
    const queuedLog = queuedLogs.find((log) => log.args.id == proposalId);
    if (queuedLog) return { log: queuedLog, state: ProposalState.QUEUED };
    const createdLog = createdLogs.find((log) => log.args.id == proposalId);
    if (createdLog) return { log: createdLog, state: ProposalState.CREATED };
    throw new Error('Proposal not found');
  },
  async simulateOnTenderly({ state, log, proposalId }) {
    const proposal = await aaveGovernanceV2Contract.read.getProposalById([proposalId]);
    if (state === ProposalState.EXECUTED) {
      const tx = await mainnetClient.getTransaction({ hash: log.transactionHash! });
      return { proposal, simulation: await tenderly.simulateTx(mainnetClient.chain.id, tx) };
    }
    const slots = getAaveGovernanceV2Slots(proposalId, proposal.executor);
    const executorContract = getContract({
      address: proposal.executor,
      abi: EXECUTOR_ABI,
      publicClient: mainnetClient,
    });
    const duration = await executorContract.read.VOTING_DURATION();
    const delay = await executorContract.read.getDelay();
    /**
     * For proposals that are still pending it might happen that the startBlock is not mined yet.
     * Therefore in this case we need to estimate the startTimestamp.
     */
    const latestBlock = await mainnetClient.getBlock();
    const isStartBlockMinted = latestBlock.number! < proposal.startBlock;
    const startTimestamp = isStartBlockMinted
      ? latestBlock.timestamp + (proposal.startBlock - latestBlock.number!) * 12n
      : (await mainnetClient.getBlock({ blockNumber: proposal.startBlock })).timestamp;

    const endBlockNumber = proposal.startBlock + duration + 2n;
    const isEndBlockMinted = latestBlock.number! > endBlockNumber;

    // construct earliest possible header for execution
    const blockHeader = {
      timestamp: toHex(startTimestamp + (duration + 1n) * 12n + delay + 1n),
      number: toHex(endBlockNumber),
    };

    const simulationPayload = {
      network_id: String(mainnetClient.chain.id),
      block_number: Number(isEndBlockMinted ? endBlockNumber : latestBlock.number),
      from: EOA,
      to: AaveGovernanceV2.GOV,
      gas_price: '0',
      value: proposal.values.reduce((sum, cur) => sum + cur).toString(),
      gas: 30_000_000,
      input: encodeFunctionData({
        abi: AAVE_GOVERNANCE_V2_ABI,
        functionName: 'execute',
        args: [proposalId],
      }),
      block_header: blockHeader,
      state_objects: {
        // Give `from` address 10 ETH to send transaction
        [EOA]: { balance: parseEther('10').toString() },
        // Ensure transactions are queued in the executor
        [proposal.executor]: {
          storage: proposal.targets.reduce((acc, target, i) => {
            const hash = keccak256(
              encodeAbiParameters(parseAbiParameters('address, uint256, string, bytes, uint256, bool'), [
                target,
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                fromHex(blockHeader.timestamp, 'bigint'),
                proposal.withDelegatecalls[i],
              ])
            );
            const slot = getSolidityStorageSlotBytes(slots.queuedTxsSlot, hash);
            acc[slot] = pad('0x1', { size: 32 });
            return acc;
          }, {}),
        },
        [AaveGovernanceV2.GOV]: {
          storage: {
            [slots.eta]: pad(blockHeader.timestamp, { size: 32 }),
            [slots.forVotes]: pad(toHex(parseEther('3000000')), { size: 32 }),
            [slots.againstVotes]: pad('0x0', { size: 32 }),
            [slots.canceled]: pad(concat([AaveGovernanceV2.GOV_STRATEGY, '0x0000']), { size: 32 }),
          },
        },
      },
    };
    return { proposal, simulation: await tenderly.simulate(simulationPayload) };
  },
};

const arcContract = getContract({
  address: AaveGovernanceV2.ARC_TIMELOCK,
  abi: ARC_TIMELOCK_ABI,
  publicClient: mainnetClient,
});

export const arc: L2NetworkModule<typeof ARC_TIMELOCK_ABI, 'ActionsSetQueued', 'ActionsSetExecuted'> = {
  name: 'Arc',
  async cacheLogs() {
    const queuedLogs = await getLogs(mainnetClient, (fromBLock, toBlock) =>
      arcContract.createEventFilter.ActionsSetQueued({
        fromBlock: fromBLock || 13581293n,
        toBlock: toBlock,
      })
    );
    const executedLogs = await getLogs(mainnetClient, (fromBLock, toBlock) =>
      arcContract.createEventFilter.ActionsSetExecuted(
        {},
        {
          fromBlock: fromBLock || 13581293n,
          toBlock: toBlock,
        }
      )
    );

    return { queuedLogs, executedLogs };
  },
  findBridgeInMainnetCalls(calls) {
    return calls.reduce((acc, call) => {
      if (call.to?.toLowerCase() === AaveGovernanceV2.ARC_TIMELOCK.toLowerCase() && call.function_name == 'queue') {
        return [...acc, call];
      }
      if (call?.calls) {
        return [...acc, ...arc.findBridgeInMainnetCalls(call?.calls)];
      }
      return acc;
    }, [] as Array<Trace>);
  },
  getProposalState: ({ trace, ...args }) =>
    getProposalState({
      ...args,
      dataValue: trace.input,
    }),
  async simulateOnTenderly({ state, executedLog, queuedLog, args }) {
    if (state === ActionSetState.EXECUTED) {
      const tx = await mainnetClient.getTransaction({ hash: executedLog.transactionHash! });
      return tenderly.simulateTx(mainnetClient.chain.id, tx);
    }
    if (state === ActionSetState.QUEUED) {
      return simulateQueuedActionSet(arcContract, mainnetClient, queuedLog);
    }
    if (state === ActionSetState.NOT_FOUND) {
      return simulateNewActionSet(arcContract, mainnetClient, args);
    }
    throw new Error(`Unexpected ActionSetState: ${state}`);
  },
};
