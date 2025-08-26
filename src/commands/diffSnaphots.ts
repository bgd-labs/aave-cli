import fs from 'node:fs';
import path from 'node:path';
import {compareStorageLayouts} from '@bgd-labs/js-utils';
import type {Command} from '@commander-js/extra-typings';
import {adiDiffReports} from '../reports/adi-diff-reports';
import {readJsonFile, readJsonString} from '../utils/json';

export function addCommand(program: Command) {
  program
    .command('adi-diff-snapshots')
    .description('generate a aDI snapshot diff report')
    .argument('<from>')
    .argument('<to>')
    .option('-o, --out <string>', 'output path')
    .option('--stringMode', 'expects input to be a string, not paths')
    .action(async (_from, _to, options) => {
      const from = options.stringMode ? readJsonString(_from) : readJsonFile(_from);
      const to = options.stringMode ? readJsonString(_to) : readJsonFile(_to);
      const content = await adiDiffReports(from, to);
      if (options.out) {
        fs.mkdirSync(path.dirname(options.out), {recursive: true});
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });

  program
    .command('diff-storage')
    .description('generate a storage diff')
    .argument('<from>')
    .argument('<to>')
    .option('-o, --out <string>', 'output path')
    .action(async (_from, _to, options) => {
      const from = readJsonFile(_from);
      const to = readJsonFile(_to);
      const content = await compareStorageLayouts(from, to);
      if (options.out) {
        fs.mkdirSync(path.dirname(options.out), {recursive: true});
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });
}
