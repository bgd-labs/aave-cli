import type { Abi } from 'abitype';
import { TenderlySimulationResponse, Trace } from '../../../utils/tenderlyClient';
import { GetFilterLogsReturnType, Hex, ReadContractReturnType } from 'viem';
import { AAVE_GOVERNANCE_V2_ABI } from '../abis/AaveGovernanceV2';
import { GetProposalStateProps, getProposalState } from './commonL2';

export type FormattedArgs = {
  targets: Hex[];
  values: bigint[];
  signatures: string[];
  calldatas: Hex[];
  withDelegatecalls: boolean[];
  proposalId?: bigint;
};

type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[]
  ? ElementType
  : never;

export enum ActionSetState {
  NOT_FOUND,
  QUEUED,
  EXECUTED,
}

export type FilterLogWithTimestamp<TAbi extends Abi, TEventName extends string> = ArrayElement<
  GetFilterLogsReturnType<TAbi, TEventName>
> & { timestamp: number };

export interface L2NetworkModule<TAbi extends Abi, TQueuedEventName extends string, TExecutedEventName extends string> {
  name: 'Optimism' | 'Polygon' | 'Arbitrum' | 'Metis' | 'Arc';
  cacheLogs: () => Promise<{
    queuedLogs: Array<FilterLogWithTimestamp<TAbi, TQueuedEventName>>;
    executedLogs: Array<FilterLogWithTimestamp<TAbi, TExecutedEventName>>;
  }>;
  findBridgeInMainnetCalls: (
    calls: TenderlySimulationResponse['transaction']['transaction_info']['call_trace']['calls']
  ) => Array<Trace>;
  getProposalState: (
    args: Omit<GetProposalStateProps<TAbi>, 'dataValue'> & { trace: Trace; fromTimestamp: number }
  ) => ReturnType<typeof getProposalState>;
  simulateOnTenderly?: (
    args: {
      args: FormattedArgs;
    } & (
      | {
          state: ActionSetState.EXECUTED;
          executedLog: FilterLogWithTimestamp<TAbi, TExecutedEventName>;
          queuedLog: FilterLogWithTimestamp<TAbi, TQueuedEventName>;
        }
      | {
          state: ActionSetState.QUEUED;
          queuedLog: FilterLogWithTimestamp<TAbi, TQueuedEventName>;
          executedLog?: undefined;
        }
      | { state: ActionSetState.NOT_FOUND; queuedLog?: undefined; executedLog?: undefined }
    )
  ) => Promise<TenderlySimulationResponse>;
}

export enum ProposalState {
  CREATED,
  QUEUED,
  EXECUTED,
}

export interface MainnetModule {
  name: string;
  cacheLogs: () => Promise<{
    createdLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalCreated'>>;
    queuedLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalQueued'>>;
    executedLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalExecuted'>>;
  }>;
  getProposalState: (args: {
    proposalId: bigint;
    createdLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalCreated'>>;
    queuedLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalQueued'>>;
    executedLogs: Array<FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalExecuted'>>;
  }) =>
    | {
        state: ProposalState.EXECUTED;
        log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalExecuted'>;
      }
    | {
        state: ProposalState.QUEUED;
        log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalQueued'>;
      }
    | {
        state: ProposalState.CREATED;
        log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalCreated'>;
      };
  simulateOnTenderly: (
    args: {
      proposalId: bigint;
    } & (
      | {
          state: ProposalState.EXECUTED;
          log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalExecuted'>;
        }
      | {
          state: ProposalState.QUEUED;
          log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalQueued'>;
        }
      | {
          state: ProposalState.CREATED;
          log: FilterLogWithTimestamp<typeof AAVE_GOVERNANCE_V2_ABI, 'ProposalCreated'>;
        }
    )
  ) => Promise<{
    proposal: ReadContractReturnType<typeof AAVE_GOVERNANCE_V2_ABI, 'getProposalById'>;
    simulation: TenderlySimulationResponse;
  }>;
}
