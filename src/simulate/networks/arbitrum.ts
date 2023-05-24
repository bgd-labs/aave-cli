import { AaveGovernanceV2 } from "@bgd-labs/aave-address-book";
import { ActionSetState, NetworkModule } from "./types";
import { decodeFunctionData, getContract } from "viem";
import {
  ARBITRUM_BRIDGE_EXECUTOR_ABI,
  ARBITRUM_BRIDGE_EXECUTOR_START_BLOCK,
} from "../abis/ArbitrumBridgeExecutor";
import { arbitrumClient } from "../../utils/rpcClients";
import { getLogs } from "../../utils/logs";

const arbitrumExecutorContract = getContract({
  address: AaveGovernanceV2.ARBITRUM_BRIDGE_EXECUTOR,
  abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
  publicClient: arbitrumClient,
});

export const arbitrum: NetworkModule = {
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
  async getProposalStateByTrace({ trace, queuedLogs, executedLogs }) {
    const dataValue = trace.decoded_input.find(
      (input) => input.soltype.name == "data"
    ).value;
    const { args } = decodeFunctionData({
      abi: ARBITRUM_BRIDGE_EXECUTOR_ABI,
      data: dataValue,
    });
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
};
