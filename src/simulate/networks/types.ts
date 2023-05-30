import type { Abi } from 'abitype';
import { TenderlySimulationResponse, TenderlyTraceResponse, Trace } from '../../utils/tenderlyClient';
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
  findBridgeInMainnetCalls: (calls: TenderlyTraceResponse['call_trace']['calls']) => Array<Trace>;
  getProposalState: <T extends ActionSetState>(args: {
    trace: Trace;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) => {
    state: T;
    log: T extends ActionSetState.EXECUTED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>
      : T extends ActionSetState.QUEUED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      : undefined;
  };
  simulateOnTenderly?: <T extends ActionSetState>(args: {
    trace: Trace;
    state: T;
    log: T extends ActionSetState.EXECUTED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>
      : T extends ActionSetState.QUEUED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      : undefined;
  }) => Promise<T extends ActionSetState.EXECUTED ? TenderlyTraceResponse : TenderlySimulationResponse>;
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
  getProposalState: <T extends ProposalState>(args: {
    proposalId: bigint;
    createdLogs: GetFilterLogsReturnType<TAbi, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<TAbi, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<TAbi, TExecutedEventName>;
  }) => {
    state: ProposalState;
    log: T extends ProposalState.EXECUTED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>
      : T extends ProposalState.QUEUED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      : ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>;
  };
  simulateOnTenderly: <T extends ProposalState>(args: {
    proposalId: bigint;
    state: ProposalState;
    log: T extends ProposalState.EXECUTED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TExecutedEventName>>
      : T extends ProposalState.QUEUED
      ? ArrayElement<GetFilterLogsReturnType<TAbi, TQueuedEventName>>
      : ArrayElement<GetFilterLogsReturnType<TAbi, TCreatedEventName>>;
  }) => Promise<T extends ProposalState.EXECUTED ? TenderlyTraceResponse : TenderlySimulationResponse>;
}
