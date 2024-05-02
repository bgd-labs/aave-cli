import fs from 'node:fs';
import type {Command} from '@commander-js/extra-typings';
import {generateCapoReport} from '../reports/capo-report';
import {readJsonFile, readJsonString} from '../utils/json';

export function addCommand(program: Command) {
  program
    .command('capo-report')
    .description('generate a capo report')
    .argument('<source>')
    .option('-o, --out <string>', 'output path')
    .option('--stringMode', 'expects input to be a string, not paths')
    .action(async (_source, options) => {
      const source = options.stringMode ? readJsonString(_source) : readJsonFile(_source);
      const content = await generateCapoReport(source);
      if (options.out) {
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });
}
