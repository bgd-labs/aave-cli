import {
  AaveV2Ethereum,
  AaveV3Ethereum,
  AaveV2EthereumAMM,
  AaveV2EthereumArc,
  AaveV2Polygon,
  AaveV3Polygon,
  AaveV2Avalanche,
  AaveV3Avalanche,
  AaveV3Arbitrum,
  AaveV3Optimism,
  AaveV3Fantom,
  AaveV3Harmony,
  AaveV3Metis,
  AaveV3Base,
  AaveV3Gnosis,
} from '@bgd-labs/aave-address-book';
import { IUiPoolDataProvider_ABI } from './abis/IUiPoolDataProvider';
import { getContract } from 'viem';
import { ReservesProvider } from './types';
import {
  mainnetClient,
  arbitrumClient,
  optimismClient,
  polygonClient,
  metisClient,
  baseClient,
  avalancheClient,
  fantomClient,
  harmonyClient,
  gnosisClient,
} from '../utils/rpcClients';

export const reserveProviders: ReservesProvider[] = [
  {
    network: 'MainnetV2',
    client: mainnetClient,
    collector: AaveV2Ethereum.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV2Ethereum.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: mainnetClient,
      }).read.getReservesData([AaveV2Ethereum.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'MainnetV3',
    client: mainnetClient,
    collector: AaveV3Ethereum.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Ethereum.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: mainnetClient,
      }).read.getReservesData([AaveV3Ethereum.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'AMM',
    client: mainnetClient,
    collector: AaveV2EthereumAMM.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV2EthereumAMM.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: mainnetClient,
      }).read.getReservesData([AaveV2EthereumAMM.POOL_ADDRESSES_PROVIDER]),
  },
  // {
  //   network: 'ARC',
  //   client: mainnetClient,
  //   collector: AaveV2EthereumArc.COLLECTOR,
  //   fetchReserves: async () =>
  //     getContract({
  //       address: AaveV2EthereumArc.AAVE_PROTOCOL_DATA_PROVIDER,
  //       abi: IUiPoolDataProvider_ABI,
  //       publicClient: mainnetClient,
  //     }).read.getReservesData([AaveV2EthereumArc.POOL_ADDRESSES_PROVIDER]),
  // },
  {
    network: 'PolygonV2',
    client: polygonClient,
    collector: AaveV2Polygon.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV2Polygon.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: polygonClient,
      }).read.getReservesData([AaveV2Polygon.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'PolygonV3',
    client: polygonClient,
    collector: AaveV3Polygon.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Polygon.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: polygonClient,
      }).read.getReservesData([AaveV3Polygon.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'AvalancheV2',
    client: avalancheClient,
    collector: AaveV2Avalanche.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV2Avalanche.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: avalancheClient,
      }).read.getReservesData([AaveV2Avalanche.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'AvalancheV3',
    client: avalancheClient,
    collector: AaveV3Avalanche.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Avalanche.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: avalancheClient,
      }).read.getReservesData([AaveV3Avalanche.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Arbitrum',
    client: arbitrumClient,
    collector: AaveV3Arbitrum.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Arbitrum.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: arbitrumClient,
      }).read.getReservesData([AaveV3Arbitrum.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Optimism',
    client: optimismClient as any,
    collector: AaveV3Optimism.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Optimism.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: optimismClient,
      }).read.getReservesData([AaveV3Optimism.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Metis',
    client: metisClient,
    collector: AaveV3Metis.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Metis.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: metisClient,
      }).read.getReservesData([AaveV3Metis.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Base',
    client: baseClient as any,
    collector: AaveV3Base.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Base.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: baseClient,
      }).read.getReservesData([AaveV3Base.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Fantom',
    client: fantomClient,
    collector: AaveV3Fantom.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Fantom.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: fantomClient,
      }).read.getReservesData([AaveV3Fantom.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Harmony',
    client: harmonyClient,
    collector: AaveV3Harmony.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Harmony.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: harmonyClient,
      }).read.getReservesData([AaveV3Harmony.POOL_ADDRESSES_PROVIDER]),
  },
  {
    network: 'Gnosis',
    client: gnosisClient,
    collector: AaveV3Gnosis.COLLECTOR,
    fetchReserves: async () =>
      getContract({
        address: AaveV3Gnosis.UI_POOL_DATA_PROVIDER,
        abi: IUiPoolDataProvider_ABI,
        publicClient: gnosisClient,
      }).read.getReservesData([AaveV3Gnosis.POOL_ADDRESSES_PROVIDER]),
  },
];
