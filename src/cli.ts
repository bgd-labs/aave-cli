#!/usr/bin/env node
import 'dotenv/config';
import { Command } from '@commander-js/extra-typings';
import { addCommand as addIpfsCommand } from './commands/ipfs-upload';
import { addCommand as addDiffSnapshots } from './commands/diff-snaphots';
import { addCommand as addGovernance } from './commands/governance';
import { addCommand as addFork } from './commands/fork';

const program = new Command();

program.name('aave-cli').description('CLI to interact with the aave ecosystem').version('0.0.0').showHelpAfterError();
addGovernance(program);
addDiffSnapshots(program);
addFork(program);
addIpfsCommand(program);

program.parse();
