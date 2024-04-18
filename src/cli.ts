#!/usr/bin/env node
import {Command, Option} from '@commander-js/extra-typings';
import 'dotenv/config';
import packageJson from '../package.json';
import {addCommand as addDiffSnapshots} from './commands/diffSnaphots';
import {addCommand as addFork} from './commands/fork';
import {addCommand as addGovernance} from './commands/governance';
import {addCommand as addIpfsCommand} from './commands/ipfsUpload';

const program = new Command();

program
  .name('aave-cli')
  .description('CLI to interact with the aave ecosystem')
  .option('-v, --verbose', 'Showing logs for all the taken steps')
  .on('option:verbose', () => {
    process.env.VERBOSE = 'true';
  })
  .addOption(
    new Option('--format <format>', 'Set preferred output format')
      .default('raw')
      .choices(['raw', 'encoded'] as const),
  )
  .on('option:format', (format) => {
    process.env.FORMAT = format;
  })
  .version(packageJson.version)
  .showHelpAfterError();
addGovernance(program);
addDiffSnapshots(program);
addFork(program);
addIpfsCommand(program);

program.parse();
