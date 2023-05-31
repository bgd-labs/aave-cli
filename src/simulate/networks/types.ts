import type { Abi } from 'abitype';
import { TenderlySimulationResponse, Trace } from '../../utils/tenderlyClient';
import { GetFilterLogsReturnType, ReadContractReturnType } from 'viem';
import { AAVE_GOVERNANCE_V2_ABI } from '../abis/AaveGovernanceV2';

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
  name: 'Optimism' | 'Polygon' | 'Arbitrum' | 'Metis';
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
    | { state: ActionSetState.NOT_FOUND; log?: undefined };
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
      | { state: ActionSetState.NOT_FOUND; log?: undefined }
    )
  ) => Promise<TenderlySimulationResponse>;
}

export enum ProposalState {
  CREATED,
  QUEUED,
  EXECUTED,
}

export interface MainnetModule<
  TCreatedEventName extends string | undefined,
  TQueuedEventName extends string | undefined,
  TExecutedEventName extends string | undefined
> {
  name: string;
  cacheLogs: () => Promise<{
    createdLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TExecutedEventName>;
  }>;
  getProposalState: (args: {
    proposalId: bigint;
    createdLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TCreatedEventName>;
    queuedLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TQueuedEventName>;
    executedLogs: GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TExecutedEventName>;
  }) =>
    | {
        state: ProposalState.EXECUTED;
        log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TExecutedEventName>>;
      }
    | {
        state: ProposalState.QUEUED;
        log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TQueuedEventName>>;
      }
    | {
        state: ProposalState.CREATED;
        log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TCreatedEventName>>;
      };
  simulateOnTenderly: (
    args: {
      proposalId: bigint;
    } & (
      | {
          state: ProposalState.EXECUTED;
          log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TExecutedEventName>>;
        }
      | {
          state: ProposalState.QUEUED;
          log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TQueuedEventName>>;
        }
      | {
          state: ProposalState.CREATED;
          log: ArrayElement<GetFilterLogsReturnType<typeof AAVE_GOVERNANCE_V2_ABI, TCreatedEventName>>;
        }
    )
  ) => Promise<{
    proposal: ReadContractReturnType<typeof AAVE_GOVERNANCE_V2_ABI, 'getProposalById'>;
    simulation: TenderlySimulationResponse;
  }>;
}
