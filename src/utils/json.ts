import fs from 'node:fs';
import path from 'node:path';
/**
 * While javascript supports bigint, JSON.parse doesn't
 * Therefore this file contains utilities to parse JSON containing bigint
 */
import JSONbig from 'json-bigint';

export function readJsonString(content: string) {
  return JSON.parse(JSON.stringify(JSONbig({storeAsString: true}).parse(content)));
}

export function readJsonFile(filePath: string) {
  const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf8');
  return readJsonString(content);
}
