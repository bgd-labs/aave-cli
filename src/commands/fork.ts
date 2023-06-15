import { tenderly } from '../utils/tenderlyClient';

export const command = 'fork';

export const describe = 'creates a tenderly fork';

export const builder = (yargs) =>
  yargs
    .option('chainId', {
      type: 'number',
      describe: 'the chainId to fork',
    })
    .option('blockNumber', {
      type: 'number',
      describe: 'the blocknumber to fork (latest if omitted)',
    })
    .option('alias', {
      type: 'string',
      describe: 'custom alias',
    });

export const handler = async function (argv) {
  await tenderly.fork({ chainId: argv.chainId, blockNumber: argv.blockNumber, alias: argv.alias });
};
