import type { Abi } from "abitype";
import { Trace } from "../../utils/tenderlyClient";
import { GetFilterLogsReturnType } from "viem";

export interface NetworkModule {
  cacheLogs: () => Promise<{ queuedLogs; executedLogs }>;
  getProposalStateByTrace?: <
    TAbi extends Abi | readonly unknown[],
    TEventName extends string | undefined
  >({}: {
    trace: Trace;
    queuedLogs: GetFilterLogsReturnType<TAbi, TEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TEventName>;
  }) => Promise<{
    state: ActionSetState;
    log: GetFilterLogsReturnType<TAbi, TEventName>;
  }>;
}

export enum ActionSetState {
  NOT_FOUND,
  QUEUED,
  EXECUTED,
}
