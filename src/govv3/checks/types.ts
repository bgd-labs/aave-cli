import { PublicClient } from 'viem';
import { PayloadsController } from '../payloadsController';
import { TenderlySimulationResponse } from '../../utils/tenderlyClient';

export type CheckResult = {
  info: string[];
  warnings: string[];
  errors: string[];
};

export interface ProposalCheck {
  name: string;
  checkProposal(
    proposalInfo: Awaited<ReturnType<PayloadsController['getPayload']>>,
    simulation: TenderlySimulationResponse,
    publicClient: PublicClient
  ): Promise<CheckResult>;
}
