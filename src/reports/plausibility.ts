import { AaveV3Snapshot } from './snapshot-types';

/**
 * Checks for common pitfalls in reserve configuration
 * @param configAfter
 */
export function checkPlausibility(configAfter: AaveV3Snapshot) {
  const warnings: string[] = [];
  Object.keys(configAfter.reserves).map((key) => {
    const reserve = configAfter.reserves[key];
    /**
     * A reserve should only have a borrow cap when borrowing is enabled
     */
    if (reserve.borrowCap && !reserve.borrowingEnabled) {
      warnings.push(`Reserve ${reserve.symbol} has a borrowCap, but borrowing is disabled`);
    }
    /**
     * A reserve debtCeiling should limit the protocol exposure,
     * if chosen to generously, the usefulness of the measure  is undermined
     */
    if (reserve.debtCeiling) {
      const maxBorrow =
        (reserve.supplyCap / 100) * (reserve.oracleLatestAnswer / reserve.oracleDecimals) * (reserve.ltv / 1000);
      if (maxBorrow > reserve.debtCeiling)
        warnings.push(
          `Reserve ${reserve.symbol} debtCeiling allows for more debt then could currently be max borrowed`
        );
    }
  });
  return warnings;
}
