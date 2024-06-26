import type {Client} from 'viem';
import type {TenderlySimulationResponse} from '../../utils/tenderlyClient';

export type CheckResult = {
  info: string[];
  warnings: string[];
  errors: string[];
};

export interface ProposalCheck<T> {
  name: string;
  checkProposal(
    proposalInfo: T,
    simulation: TenderlySimulationResponse,
    client: Client,
  ): Promise<CheckResult>;
}
