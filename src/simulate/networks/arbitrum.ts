import { AaveGovernanceV2 } from "@bgd-labs/aave-address-book";
import { ActionSetState, NetworkModule } from "./types";
import {
  Address,
  decodeFunctionData,
  encodeFunctionData,
  getContract,
  toHex,
} from "viem";
import {
  ARBITRUM_BRIDGE_EXECUTOR_ABI,
  ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
} from "../abis/ArbitrumBridgeExecutor";
import { arbitrumClient } from "../../utils/rpcClients";
import { getLogs } from "../../utils/logs";
import {
  Input,
  SoltypeElement,
  StateObject,
  tenderly,
} from "../../utils/tenderlyClient";
import { EOA } from "../../utils/constants";
import { MOCK_EXECUTOR_BYTECODE } from "../abis/MockExecutor";

const arbitrumExecutorContract = getContract({
  address: AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
  abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
  publicClient: arbitrumClient,
});

export const arbitrum: NetworkModule<
  typeof ARBITRUM_BRIDGE_EXECUTOR_ABI,
  "ActionsSetQueued",
  "ActionsSetExecuted"
> = {
  async cacheLogs() {
    const queuedLogs = await getLogs(arbitrumClient, (fromBLock, toBlock) =>
      arbitrumExecutorContract.createEventFilter.ActionsSetQueued(
        {},
        {
          fromBlock: fromBLock || ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );
    const executedLogs = await getLogs(arbitrumClient, (fromBLock, toBlock) =>
      arbitrumExecutorContract.createEventFilter.ActionsSetExecuted(
        {},
        {
          fromBlock: fromBLock || ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
          toBlock: toBlock,
        }
      )
    );

    return { queuedLogs, executedLogs };
  },
  getProposalStateByTrace({ trace, queuedLogs, executedLogs }) {
    const dataValue = trace.decoded_input.find(
      (input) => input.soltype.name === "data"
    ).value as `0x${string}`;
    const { args } = decodeFunctionData({
      abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
      data: dataValue,
    });
    if (!args) throw new Error("Error: cannot decode trace");
    const queuedLog = queuedLogs.find(
      (event) => JSON.stringify(event.args.targets) == JSON.stringify(args[0])
    );
    if (queuedLog) {
      const executedLog = executedLogs.find(
        (event) => event.args.id == queuedLog.args.id
      );
      if (executedLog) {
        console.log("arbitrum payload executed");
        return { log: executedLog, state: ActionSetState.EXECUTED };
      } else {
        console.log("arbitrum payload queued");
        return { log: queuedLog, state: ActionSetState.QUEUED };
      }
    }
    console.log("arbitrum payload not found");
    return { state: ActionSetState.NOT_FOUND };
  },
  async simulateOnTenderly({ state, log, trace }) {
    if (state === ActionSetState.EXECUTED) {
      console.log("using tenderly trace api for ", log.transactionHash!);
      return tenderly.trace(arbitrumClient.chain.id, log.transactionHash!);
    }
    if (state === ActionSetState.QUEUED) {
      console.log("using tenderly simulation api");
      const gracePeriod = await arbitrumExecutorContract.read.getGracePeriod();
      const currentBlock = await arbitrumClient.getBlock();
      /**
       * When the proposal is expired, simulate one block after queuing
       * When the proposal could still be executed, simulate on current block
       */
      const simulationBlock =
        currentBlock.timestamp > BigInt(log.args.executionTime!) + gracePeriod
          ? Number(log.blockNumber) + 1
          : (currentBlock.number as bigint) - BigInt(1);

      const simulationPayload = {
        network_id: String(arbitrumClient.chain.id),
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
    if (state === ActionSetState.NOT_FOUND) {
      const dataValue = trace.decoded_input.find(
        (input) => input.soltype.name === "data"
      ).value as `0x${string}`;
      const simulationPayload = {
        network_id: String(arbitrumClient.chain.id),
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
