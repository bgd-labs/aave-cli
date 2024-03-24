import path from 'path';
import { existsSync, mkdirSync, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import hash from 'object-hash';
import { AaveV3Strategy } from './snapshot-types';

/**
 * Fetches the rate image from rate-strategy explorer
 * @dev currently broken as https://github.com/foundry-rs/foundry/issues/4601 results in json numbers which will be broken inside js
 * @param {*} rate
 * @param fileName the fileName to store the ir to
 */
export async function fetchRateStrategyImage(rate: AaveV3Strategy) {
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
    optimalUsageRatio: rate.optimalUsageRatio,
    baseVariableBorrowRate: rate.baseVariableBorrowRate,
    maxVariableBorrowRate: rate.maxVariableBorrowRate,
  };
  const searchParams = new URLSearchParams(paramsObj);
  const writeStream = createWriteStream(pathWithFile);
  const { body } = await fetch(`https://dash.onaave.com/api/static?${searchParams.toString()}`);
  if (!body) throw Error('Error fetching the image');
  await finished(Readable.fromWeb(body as any).pipe(writeStream));
}
