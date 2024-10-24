import type {AaveV3Strategy} from './snapshot-types';

/**
 * Fetches the rate image from rate-strategy explorer
 * @dev currently broken as https://github.com/foundry-rs/foundry/issues/4601 results in json numbers which will be broken inside js
 * @param {*} rate
 * @param fileName the fileName to store the ir to
 */
export function getStrategyImageUrl(rate: AaveV3Strategy) {
  const paramsObj: {[key: string]: string} = {
    variableRateSlope1: rate.variableRateSlope1,
    variableRateSlope2: rate.variableRateSlope2,
    optimalUsageRatio: rate.optimalUsageRatio,
    baseVariableBorrowRate: rate.baseVariableBorrowRate,
    maxVariableBorrowRate: rate.maxVariableBorrowRate,
  };
  const searchParams = new URLSearchParams(paramsObj);
  return `https://dash.onaave.com/api/static?${searchParams.toString()}`;
}
