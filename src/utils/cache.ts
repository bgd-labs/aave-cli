/**
 * simple opinionated cache helper that reads and writes to json files
 * - cache is stored in cache folder
 * - files are suffixed with json
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';

const DEFAULT_PATH = path.join(process.cwd(), 'cache');

export function readJSONCache<T = any>(filePath: string, filename: string | number): T | undefined {
  const joinedPath = path.join(DEFAULT_PATH, filePath, `${filename}.json`);
  if (existsSync(joinedPath)) {
    return JSON.parse(readFileSync(joinedPath, 'utf8'));
  }
}

export function writeJSONCache<T extends {}>(filePath: string, filename: string | number, json: T) {
  const joinedFolderPath = path.join(DEFAULT_PATH, filePath);
  if (!existsSync(joinedFolderPath)) {
    mkdirSync(joinedFolderPath, { recursive: true });
  }
  const joinedFilePath = path.join(joinedFolderPath, `${filename}.json`);
  writeFileSync(
    joinedFilePath,
    JSON.stringify(json, (key, value) => (typeof value === 'bigint' ? value.toString() : value), 2)
  );
}
