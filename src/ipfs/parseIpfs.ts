import matter from 'gray-matter';
import base58 from 'bs58';
import fetch from 'node-fetch';

export type ProposalMetadata = {
  title: string;
  description: string;
  shortDescription?: string;
  ipfsHash: string;
  aip?: number;
  discussions: string;
  author: string;
};

export function getLink(hash: string, gateway: string): string {
  return `${gateway}/${hash}`;
}

export async function getProposalMetadata(
  hash: string,
  gateway: string = 'https://cloudflare-ipfs.com/ipfs'
): Promise<ProposalMetadata> {
  const ipfsHash = hash.startsWith('0x') ? base58.encode(Buffer.from(`1220${hash.slice(2)}`, 'hex')) : hash;
  try {
    const ipfsResponse = await fetch(getLink(ipfsHash, gateway), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!ipfsResponse.ok) throw Error('Fetch not working');
    const clone = await ipfsResponse.clone();
    try {
      const response = await ipfsResponse.json();
      const { content, data } = matter(response.description);
      return {
        ...response,
        ipfsHash,
        description: content,
        ...data,
      };
      // matter will error in case the proposal is not valid yaml (like on proposal 0)
      // therefore in the case of an error we just inline the complete ipfs content
    } catch (e) {
      const { content, data } = matter(await clone.text());
      return {
        ...ipfsResponse,
        ipfsHash,
        description: content,
        ...(data as { title: string; discussions: string; author: string }),
      };
    }
  } catch (e) {
    return {
      ipfsHash,
      description: 'ipfs file not reachable',
      title: 'ipfs file not reachable',
    } as ProposalMetadata;
  }
}
