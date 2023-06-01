import chalk from 'chalk';

export function logInfo(topic: string, text: string) {
  console.log(chalk.blue(`Info[${topic}]: ${text}`));
}

export function logError(topic: string, text: string) {
  console.log(chalk.red(`Info[${topic}]: ${text}`));
}

export function logSuccess(topic: string, text: string) {
  console.log(chalk.green(`Info[${topic}]: ${text}`));
}
