import chalk from 'chalk';
import {VERBOSE} from './constants';

export function logVerbose(topic: string, text: string | number | bigint) {
  if (VERBOSE) console.log(chalk.gray(`Info[${topic}]: ${text}`));
}

export function logInfo(topic: string, text: string | number | bigint) {
  console.log(chalk.blue(`Info[${topic}]: ${text}`));
}

export function logWarning(topic: string, text: string | number | bigint) {
  console.log(chalk.yellow(`Warning[${topic}]: ${text}`));
}

export function logError(topic: string, text: string | number | bigint) {
  console.log(chalk.red(`Error[${topic}]: ${text}`));
}

export function logSuccess(topic: string, text: string | number | bigint) {
  console.log(chalk.green(`Success[${topic}]: ${text}`));
}
