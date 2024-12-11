import {ChainId} from '@bgd-labs/rpc-env';
import type {Command} from '@commander-js/extra-typings';
import {getBlockNumber} from 'viem/actions';
import {getClient} from '../utils/getClient';

export function addCommand(program: Command) {
  program
    .command('blocks')
    .description('returns the latest block on all chains supported by aave')
    .action(async (_source, options) => {
      await Promise.all(
        Object.values(ChainId).map(async (chainId) => {
          const client = getClient(chainId);
          if (client) {
            const blockNumber = await getBlockNumber(client);
            console.log(client.chain.name, client.chain.id, String(blockNumber));
          }
        }),
      );
    });
}
