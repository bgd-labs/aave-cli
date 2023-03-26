import { z } from "zod";

export const aaveV3ReserveSchema = z.object({
  isBorrowableInIsolation: z.boolean(),
  borrowCap: z.number(),
  liquidationBonus: z.number(),
  underlying: z.string(),
  isFrozen: z.boolean(),
  stableDebtToken: z.string(),
  variableDebtToken: z.string(),
  reserveFactor: z.number(),
  liquidationProtocolFee: z.number(),
  usageAsCollateralEnabled: z.boolean(),
  ltv: z.number(),
  supplyCap: z.number(),
  debtCeiling: z.number(),
  borrowingEnabled: z.boolean(),
  isActive: z.boolean(),
  eModeCategory: z.number(),
  symbol: z.string(),
  stableBorrowRateEnabled: z.boolean(),
  isFlashloanable: z.boolean(),
  aToken: z.string(),
  liquidationThreshold: z.number(),
  aTokenImpl: z.string(),
  stableDebtTokenImpl: z.string(),
  interestRateStrategy: z.string(),
  variableDebtTokenImpl: z.string(),
  oracle: z.object({ latestAnswer: z.number(), address: z.string() }),
  decimals: z.number(),
  isSiloed: z.boolean(),
});

export type AaveV3Reserve = z.infer<typeof aaveV3ReserveSchema>;

export const aaveV3StrategySchema = z.object({
  baseStableBorrowRate: z.number(),
  maxExcessStableToTotalDebtRatio: z.number(),
  address: z.string(),
  baseVariableBorrowRate: z.number(),
  stableRateSlope2: z.number(),
  optimalUsageRatio: z.number(),
  variableRateSlope2: z.number(),
  optimalStableToTotalDebtRatio: z.number(),
  maxExcessUsageRatio: z.number(),
  stableRateSlope1: z.number(),
  variableRateSlope1: z.number(),
});

export type AaveV3Strategy = z.infer<typeof aaveV3StrategySchema>;

export const aaveV3EmodeSchema = z.object({
  eModeCategory: z.number(),
  liquidationBonus: z.number(),
  label: z.string(),
  liquidationThreshold: z.number(),
  priceSource: z.string(),
  ltv: z.number(),
});

export type AaveV3Emode = z.infer<typeof aaveV3EmodeSchema>;

export const aaveV3SnapshotSchema = z.object({
  reserves: z.record(aaveV3ReserveSchema),
  strategies: z.record(aaveV3StrategySchema),
  eModes: z.record(aaveV3EmodeSchema),
});

export type AaveV3Snapshot = z.infer<typeof aaveV3SnapshotSchema>;

export type DiffedInput<T> = Record<
  string,
  { from: T | null; to: T | null } & Partial<{
    [K in keyof T]?: { from: T[K]; to: T[K] };
  }>
>;
