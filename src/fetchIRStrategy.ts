import fs from "node:fs";
import path from "path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import fetch from "node-fetch";

/**
 * Fetches the rate image from rate-strategy explorer
 * @dev currently broken as https://github.com/foundry-rs/foundry/issues/4601 results in json numbers which will be broken inside js
 * @param {*} rate
 * @param fileName the fileName to store the ir to
 */
export async function fetchRateStrategyImage(rate, fileName) {
  const relativePath = path.join(process.cwd(), ".assets");
  const pathWithFile = path.join(relativePath, `${fileName}.svg`);
  // skip in case file already exists
  if (fs.existsSync(pathWithFile)) return;
  // create folder if it doesn't exist
  if (!fs.existsSync(relativePath)) {
    fs.mkdirSync(relativePath, { recursive: true });
  }
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
  const fileStream = fs.createWriteStream(pathWithFile);
  if (!body) throw Error("Error fetchign the image");
  // any cast due to some mismatch on ReadableStream node vs web
  await finished(Readable.fromWeb(body as any).pipe(fileStream));
}
