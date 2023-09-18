import { PublicClient } from 'viem';
import { TenderlySimulationResponse } from '../../utils/tenderlyClient';

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
    publicClient: PublicClient
  ): Promise<CheckResult>;
}
