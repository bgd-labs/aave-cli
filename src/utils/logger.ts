import chalk from 'chalk';

export function logInfo(topic: string, text: string | number | bigint) {
  console.log(chalk.blue(`Info[${topic}]: ${text}`));
}

export function logWarning(topic: string, text: string) {
  console.log(chalk.yellow(`Warning[${topic}]: ${text}`));
}

export function logError(topic: string, text: string) {
  console.log(chalk.red(`Error[${topic}]: ${text}`));
}

export function logSuccess(topic: string, text: string) {
  console.log(chalk.green(`Success[${topic}]: ${text}`));
}
