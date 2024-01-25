import { Command } from '@commander-js/extra-typings';
import { diffReports } from '../reports/diff-reports';
import { readJsonString, readJsonFile } from '../utils/json';
import fs from 'fs';
import { compareStorageLayouts } from '@bgd-labs/js-utils';

export function addCommand(program: Command) {
  program
    .command('diff-snapshots')
    .description('generate a snapshot diff report')
    .argument('<from>')
    .argument('<to>')
    .option('-o, --out <string>', 'output path')
    .option('--stringMode', 'expects input to be a string, not paths')
    .action(async (_from, _to, options) => {
      const from = options.stringMode ? readJsonString(_from) : readJsonFile(_from);
      const to = options.stringMode ? readJsonString(_to) : readJsonFile(_to);
      const content = await diffReports(from, to);
      if (options.out) {
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
        fs.writeFileSync(options.out, content);
      } else {
        console.log(content);
      }
    });
}
