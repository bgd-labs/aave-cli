import fs from 'fs';
import path from 'path';
import Hash from 'ipfs-only-hash';
import bs58 from 'bs58';
import { validateAIPHeader } from '../ipfs/aip-validation';

// https://ethereum.stackexchange.com/questions/44506/ipfs-hash-algorithm
async function getHash(data: string) {
  return Hash.of(data);
}

async function uploadToPinata(source: string) {
  const PINATA_KEY = process.env.PINATA_KEY;
  if (!PINATA_KEY) throw new Error('PINATA_KEY env must be set');
  const PINATA_SECRET = process.env.PINATA_SECRET;
  if (!PINATA_SECRET) throw new Error('PINATA_SECRET env must be set');
  const data = new FormData();
  data.append('file', new Blob([source]));
  const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
    method: 'POST',
    body: data,
    headers: {
      pinata_api_key: PINATA_KEY,
      pinata_secret_api_key: PINATA_SECRET,
    },
  });

  if (!res.ok) {
    throw Error(await res.text());
  }

  const result = await res.json();

  if (result.error) throw { message: result.error };
  return result;
}

async function uploadToTheGraph(source: string) {
  const data = new FormData();
  data.append('file', new Blob([source]));
  const res = await fetch('https://api.thegraph.com/ipfs/api/v0/add', {
    method: 'POST',
    body: data,
  });
  return await res.json();
}

export const command = 'ipfs <source>';

export const describe = 'generates the ipfs hash for specified source';

export const builder = (yargs) =>
  yargs
    // .positional('source', {
    //   describe: 'path to the source',
    //   type: 'string',
    // })
    .option('upload', {
      describe: 'upload to ipfs',
      default: false,
      alias: 'u',
      type: 'boolean',
    })
    .option('verbose', {
      default: false,
      type: 'boolean',
    });

export const handler = async function (argv) {
  const filePath = path.join(process.cwd(), argv.source);
  const content = fs.readFileSync(filePath, 'utf8');
  validateAIPHeader(content);

  const hash = await getHash(content);
  const bs58Hash = `0x${Buffer.from(bs58.decode(hash)).slice(2).toString('hex')}`;

  if (argv.upload) {
    const [pinata, thegraph] = await Promise.all([uploadToPinata(content), uploadToTheGraph(content)]);
    if (argv.verbose) {
      console.log('pinata response', pinata);
      console.log('thegraph response', thegraph);
    }
  }

  // log as hex to console so foundry can read the content
  console.log(bs58Hash);
};
