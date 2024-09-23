// Based on https://github.com/alanshaw/ipfs-only-hash/blob/master/index.js
// added types and updated dependencies
import {importer, ImporterOptions} from 'ipfs-unixfs-importer';

const block = {
  get: async (cid: string) => {
    throw new Error(`unexpected block API get for ${cid}`);
  },
  put: async () => {
    throw new Error('unexpected block API put');
  },
};

export const Hash = {
  of: async (content: string | Uint8Array, options: ImporterOptions = {}) => {
    options = options || {};

    if (typeof content === 'string') {
      content = new TextEncoder().encode(content);
    }

    let lastCid;
    for await (const {cid} of importer([{content}], block, options)) {
      lastCid = cid;
    }

    return `${lastCid}`;
  },
};
