import { AaveGovernanceV2 } from "@bgd-labs/aave-address-book";
import { MainnetModule, ProposalState } from "./types";
import {
  decodeFunctionData,
  encodeFunctionData,
  getContract,
  toHex,
} from "viem";
import {
  ARBITRUM_BRIDGE_EXECUTOR_ABI,
  ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
} from "../abis/ArbitrumBridgeExecutor";
import { mainnetClient } from "../../utils/rpcClients";
import { getLogs } from "../../utils/logs";
import { StateObject, tenderly } from "../../utils/tenderlyClient";
import { EOA } from "../../utils/constants";
import { MOCK_EXECUTOR_BYTECODE } from "../abis/MockExecutor";
import {
  AAVE_GOVERNANCE_V2_ABI,
  AAVE_GOVERNANCE_V2_START_BLOCK,
} from "../abis/AaveGovernanceV2";

const aaveGovernanceV2 = getContract({
  address: AaveGovernanceV2.GOV,
  abi: AAVE_GOVERNANCE_V2_ABI,
  publicClient: mainnetClient,
});

export const mainnet: MainnetModule<
  typeof AAVE_GOVERNANCE_V2_ABI,
  "ProposalCreated",
  "ProposalQueued",
  "ProposalExecuted"
> = {
  async cacheLogs() {
    const createdLogs = await getLogs(mainnetClient, (fromBLock, toBlock) =>
      aaveGovernanceV2.createEventFilter.ProposalCreated(
        {},
        {
          fromBlock: fromBLock || AAVE_GOVERNANCE_V2_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const queuedLogs = await getLogs(mainnetClient, (fromBLock, toBlock) =>
      aaveGovernanceV2.createEventFilter.ProposalQueued(
        {},
        {
          fromBlock: fromBLock || AAVE_GOVERNANCE_V2_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const executedLogs = await getLogs(mainnetClient, (fromBLock, toBlock) =>
      aaveGovernanceV2.createEventFilter.ProposalExecuted(
        {},
        {
          fromBlock: fromBLock || AAVE_GOVERNANCE_V2_START_BLOCK,
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
    return { log: createdLog, state: ProposalState.CREATED };
  },
  async simulateOnTenderly({ state, log, trace }) {
    if (state === ProposalState.EXECUTED) {
      console.log("using tenderly trace api for ", log.transactionHash!);
      return tenderly.trace(mainnetClient.chain.id, log.transactionHash!);
    }
    if (state === ProposalState.QUEUED) {
      console.log("using tenderly simulation api");
      const gracePeriod = await aaveGovernanceV2.read.getGracePeriod();
      const currentBlock = await mainnetClient.getBlock();
      /**
       * When the proposal is expired, simulate one block after queuing
       * When the proposal could still be executed, simulate on current block
       */
      const simulationBlock =
        currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
          ? Number(log.blockNumber) + 1
          : (currentBlock.number as bigint) - BigInt(1);

      const simulationPayload = {
        network_id: String(mainnetClient.chain.id),
        from: EOA,
        to: AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
        block_number: Number(simulationBlock),
        input: encodeFunctionData({
          abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
          functionName: "execute",
          args: [log.args.id!],
        }),
        block_header: {
          timestamp: toHex(BigInt(log.args.executionTime!)),
        },
      };
      return tenderly.simulate(simulationPayload);
    }
    if (state === ProposalState.CREATED) {
      const dataValue = trace.decoded_input.find(
        (input) => input.soltype.name === "data"
      ).value as `0x${string}`;
      const simulationPayload = {
        network_id: String(mainnetClient.chain.id),
        from: EOA,
        to: AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
        input: dataValue,
        state_objects: {
          [AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR]: {
            code: MOCK_EXECUTOR_BYTECODE,
          },
        },
      };
      const queueResult = await tenderly.simulate(simulationPayload);

      const queueState =
        queueResult.transaction.transaction_info.state_diff.reduce(
          (acc, diff) => {
            diff.raw.forEach((raw) => {
              if (!acc[raw.address]) acc[raw.address] = { storage: {} };
              acc[raw.address].storage![raw.key] = raw.dirty;
            });
            return acc;
          },
          {} as Record<string, StateObject>
        );
      queueState[AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR] = {
        code: MOCK_EXECUTOR_BYTECODE,
      };
      const id = queueResult.transaction.transaction_info.state_diff.find(
        (diff) =>
          diff.address.toLowerCase() ===
            AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR.toLowerCase() &&
          diff.soltype.name === "_actionsSetCounter"
      );

      return await tenderly.simulate({
        ...simulationPayload,
        state_objects: queueState,
        input: encodeFunctionData({
          abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
          functionName: "execute",
          args: [id.original],
        }),
      });
    }
  },
};
