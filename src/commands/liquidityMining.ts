import fs from 'node:fs';
import type {Command} from '@commander-js/extra-typings';
import {generateLiquidityMiningReport} from '../reports/lm-report';
import {readJsonFile, readJsonString} from '../utils/json';

export function addCommand(program: Command) {
  program
    .command('lm-report')
    .description('generate a liquidity mining report')
    .argument('<source>')
    .option('-o, --out <string>', 'output path')
    .option('--stringMode', 'expects input to be a string, not paths')
    .action(async (_source, options) => {
      const source = options.stringMode ? readJsonString(_source) : readJsonFile(_source);
      const content = await generateLiquidityMiningReport(source);
      if (options.out) {
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });
}
