import fs from 'node:fs';
import type {Command} from '@commander-js/extra-typings';
import {generateSvrCapoReport} from '../reports/capo-svr-comparative-report';
import {readJsonFile, readJsonString} from '../utils/json';

export function addCommand(program: Command) {
  program
    .command('capo-svr-report')
    .description('generate a capo svr comparative report')
    .argument('<source>')
    .option('-o, --out <string>', 'output path')
    .option('--stringMode', 'expects input to be a string, not paths')
    .action(async (_source, options) => {
      const source = options.stringMode ? readJsonString(_source) : readJsonFile(_source);
      const content = await generateSvrCapoReport(source);
      if (options.out) {
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });
}
