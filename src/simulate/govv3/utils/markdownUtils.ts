import { Hex, PublicClient } from 'viem';

export function boolToMarkdown(value: boolean) {
  if (value) return `:white_check_mark:`;
  return `:sos:`;
}

/**
 * Turns a plaintext address into a link to etherscan page of that address
 * @param address to be linked
 * @param code whether to link to the code tab
 */
export function toAddressLink(address: Hex, code: boolean = false, client: PublicClient): string {
  return `[${address}](${client.chain?.blockExplorers?.default.url}/address/${address}${code ? '#code' : ''})`;
}

/**
 * Turns a plaintext address into a link to etherscan page of that address
 * @param address to be linked
 * @param code whether to link to the code tab
 */
export function toTxLink(txn: Hex, md: boolean, client: PublicClient): string {
  const link = `${client.chain?.blockExplorers?.default.url}/tx/${txn}`;
  if (md) return `[${txn}](${link})`;
  return link;
}
