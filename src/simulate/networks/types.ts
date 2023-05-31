import type { Abi } from 'abitype';
import { TenderlySimulationResponse, Trace } from '../../utils/tenderlyClient';
import { GetFilterLogsReturnType } from 'viem';

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

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
  name: string;
  cacheLogs: () => Promise<{
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }>;
  findBridgeInMainnetCalls: (
    calls: TenderlySimulationResponse['transaction']['transaction_info']['call_trace']['calls']
  ) => Array<Trace>;
  getProposalState: (args: {
    trace: Trace;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) =>
    | {
        state: ActionSetState.EXECUTED;
        log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
      }
    | {
        state: ActionSetState.QUEUED;
        log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
      }
    | { state: ActionSetState.NOT_FOUND; log: undefined };
  simulateOnTenderly?: (
    args: {
      trace: Trace;
    } & (
      | {
          state: ActionSetState.EXECUTED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
        }
      | {
          state: ActionSetState.QUEUED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
        }
      | { state: ActionSetState.NOT_FOUND; log: undefined }
    )
  ) => Promise<TenderlySimulationResponse>;
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
  name: string;
  cacheLogs: () => Promise<{
    createdLogs: GetFilterLogsReturnType<TAbi, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }>;
  getProposalState: (args: {
    proposalId: bigint;
    createdLogs: GetFilterLogsReturnType<TAbi, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) =>
    | {
        state: ProposalState.EXECUTED;
        log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
      }
    | {
        state: ProposalState.QUEUED;
        log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
      }
    | {
        state: ProposalState.CREATED;
        log: ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>;
      };
  simulateOnTenderly: (
    args: {
      proposalId: bigint;
    } & (
      | {
          state: ProposalState.EXECUTED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>;
        }
      | {
          state: ProposalState.QUEUED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>;
        }
      | {
          state: ProposalState.CREATED;
          log: ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>;
        }
    )
  ) => Promise<TenderlySimulationResponse>;
}
