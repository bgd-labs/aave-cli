import type { Abi } from "abitype";
import { Trace } from "../../utils/tenderlyClient";
import { GetFilterLogsReturnType } from "viem";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export interface NetworkModule<
  TAbi extends Abi | readonly unknown[],
  TQueuedEventName extends string | undefined,
  TExecutedEventName extends string | undefined
> {
  cacheLogs: () => Promise<{ queuedLogs; executedLogs }>;
  getProposalStateByTrace?: (args: {
    trace: Trace;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) => {
    state: ActionSetState;
    log?:
      | GetFilterLogsReturnType<TAbi, TQueuedEventName>[0]
      | GetFilterLogsReturnType<TAbi, TExecutedEventName>[0];
  };
  simulateOnTenderly: (
    args: { trace: Trace } & (
      | {
          state: ActionSetState.NOT_FOUND;
          log: undefined;
        }
      | {
          state: ActionSetState.QUEUED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
        }
      | {
          state: ActionSetState.EXECUTED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
        }
    )
  ) => Promise<unknown>;
}

export enum ActionSetState {
  NOT_FOUND,
  QUEUED,
  EXECUTED,
}
