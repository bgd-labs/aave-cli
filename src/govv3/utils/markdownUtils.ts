import { Client, Hex } from 'viem';
import { CheckResult } from '../checks/types';

export function boolToMarkdown(value: boolean) {
  if (value) return `:white_check_mark:`;
  return `:sos:`;
}

/**
 * Turns a plaintext address into a link to etherscan page of that address
 * @param address to be linked
 * @param code whether to link to the code tab
 */
export function toAddressLink(address: Hex, md: boolean, client?: Client): string {
  if (!client) return address;
  const link = `${client.chain?.blockExplorers?.default.url}/address/${address}`;
  if (md) return toMarkdownLink(link, address);
  return link;
}

/**
 * Turns a plaintext address into a link to etherscan page of that address
 * @param address to be linked
 * @param code whether to link to the code tab
 */
export function toTxLink(txn: Hex, md: boolean, client?: Client): string {
  if (!client) return txn;
  const link = `${client.chain?.blockExplorers?.default.url}/tx/${txn}`;
  if (md) return toMarkdownLink(link, txn);
  return link;
}

export function toMarkdownLink(link: string, title?: any) {
  return `[${title || link}](${link})`;
}

export function renderCheckResult(check: { name: string }, result: CheckResult) {
  let response = `### Check: ${check.name} ${boolToMarkdown(!result.errors.length)}\n\n`;
  if (result.errors.length) response += `#### Errors\n\n${result.errors.join('\n')}\n\n`;
  if (result.warnings.length) response += `#### Warnings\n\n${result.warnings.join('\n')}\n\n`;
  if (result.info.length) response += `#### Info\n\n${result.info.join('\n')}\n\n`;
  return response;
}

export function renderUnixTime(time: number) {
  return new Date(time * 1000).toLocaleString('en-GB', { timeZone: 'UTC' });
}

export function flagKnownAddress(isKnown: string[] | void) {
  if (isKnown == undefined || isKnown.length == 0) return '';
  return `[:ghost:](https://github.com/bgd-labs/aave-address-book "${isKnown.join(', ')}")`;
}
