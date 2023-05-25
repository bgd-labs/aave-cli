import type { Abi } from "abitype";
import { Trace } from "../../utils/tenderlyClient";
import { GetFilterLogsReturnType } from "viem";

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;

export enum ActionSetState {
  NOT_FOUND,
  QUEUED,
  EXECUTED,
}

export interface L2NetworkModule<
  TAbi extends Abi | readonly unknown[],
  TQueuedEventName extends string | undefined,
  TExecutedEventName extends string | undefined
> {
  cacheLogs: () => Promise<{
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }>;
  getProposalState?: (args: {
    trace: Trace;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) => {
    state: ActionSetState;
    log?:
      | ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      | ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
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

export enum ProposalState {
  CREATED,
  QUEUED,
  EXECUTED,
}
export interface MainnetModule<
  TAbi extends Abi | readonly unknown[],
  TCreatedEventName extends string | undefined,
  TQueuedEventName extends string | undefined,
  TExecutedEventName extends string | undefined
> {
  cacheLogs: () => Promise<{
    createdLogs: GetFilterLogsReturnType<TAbi, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }>;
  getProposalState?: (args: {
    proposalId: bigint;
    createdLogs: GetFilterLogsReturnType<TAbi, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) => {
    state: ProposalState;
    log?:
      | ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>
      | ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      | ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
  };
  simulateOnTenderly: (
    args: { proposalId: bigint } & (
      | {
          state: ProposalState.CREATED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>;
        }
      | {
          state: ProposalState.QUEUED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
        }
      | {
          state: ProposalState.EXECUTED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
        }
    )
  ) => Promise<unknown>;
}
