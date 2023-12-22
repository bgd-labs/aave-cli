import { Hex, ReadContractReturnType, PublicClient } from 'viem';
import { IUiPoolDataProvider_ABI } from './abis/IUiPoolDataProvider';

export interface ReservesProvider {
  network:
    | 'MainnetV2'
    | 'MainnetV3'
    | 'ARC'
    | 'AMM'
    | 'PolygonV2'
    | 'PolygonV3'
    | 'AvalancheV2'
    | 'AvalancheV3'
    | 'Optimism'
    | 'Arbitrum'
    | 'Metis'
    | 'Base'
    | 'Fantom'
    | 'Harmony'
    | 'Gnosis';
  client: PublicClient;
  collector: Hex;
  fetchReserves(): Promise<ReadContractReturnType<typeof IUiPoolDataProvider_ABI, 'getReservesData'>>;
}

export interface Balance {
  tokenSymbol: string;
  balance: BigInt;
}
