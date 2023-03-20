import fs from "fs";
import { Readable } from "stream";
import { finished } from "stream/promises";

/**
 * Fetches the rate image from rate-strategy explorer
 * @dev currently broken as https://github.com/foundry-rs/foundry/issues/4601 results in json numbers which will be broken inside js
 * @param {*} rate
 */
async function fetchRate(rate) {
  const paramsObj = {
    variableRateSlope1: rate.variableRateSlope1,
    variableRateSlope2: rate.variableRateSlope2,
    stableRateSlope1: rate.stableRateSlope1,
    stableRateSlope2: rate.stableRateSlope2,
    optimalUsageRatio: rate.optimalUsageRatio,
    baseVariableBorrowRate: rate.baseVariableBorrowRate,
    baseStableBorrowRate: rate.baseStableBorrowRate,
  };
  const searchParams = new URLSearchParams(paramsObj);
  const { body } = await fetch(
    `https://rate-strategy-explorer.vercel.app/api/static?${searchParams.toString()}`
  );
  const fileStream = fs.createWriteStream(searchParams.toString());
  if (!body) throw Error("Error fetchign the image");
  // any cast due to some mismatch on ReadableStream node vs web
  await finished(Readable.fromWeb(body as any).pipe(fileStream));
}
