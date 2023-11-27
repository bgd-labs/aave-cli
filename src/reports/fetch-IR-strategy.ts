import path from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import fetch from 'node-fetch';
import hash from 'object-hash';

const streamPipeline = promisify(pipeline);

/**
 * Fetches the rate image from rate-strategy explorer
 * @dev currently broken as https://github.com/foundry-rs/foundry/issues/4601 results in json numbers which will be broken inside js
 * @param {*} rate
 * @param fileName the fileName to store the ir to
 */
export async function fetchRateStrategyImage(rate: any) {
  const fileHash = hash(rate);
  const relativePath = path.join(process.cwd(), '.assets');
  const pathWithFile = path.join(relativePath, `${fileHash}.svg`);
  // skip in case file already exists
  if (existsSync(pathWithFile)) return;
  // create folder if it doesn't exist
  if (!existsSync(relativePath)) {
    mkdirSync(relativePath, { recursive: true });
  }
  const paramsObj: { [key: string]: string } = {
    variableRateSlope1: rate.variableRateSlope1,
    variableRateSlope2: rate.variableRateSlope2,
    stableRateSlope1: rate.stableRateSlope1,
    stableRateSlope2: rate.stableRateSlope2,
    optimalUsageRatio: rate.optimalUsageRatio,
    baseVariableBorrowRate: rate.baseVariableBorrowRate,
  };
  if (rate.baseStableBorrowRate != undefined) paramsObj.baseStableBorrowRate = rate.baseStableBorrowRate;
  const searchParams = new URLSearchParams(paramsObj);
  const { body } = await fetch(`https://rate-strategy-explorer.vercel.app/api/static?${searchParams.toString()}`);
  if (!body) throw Error('Error fetchign the image');
  await streamPipeline(body, createWriteStream(pathWithFile));
}
