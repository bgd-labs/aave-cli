#!/usr/bin/env node
import 'dotenv/config';
import { Command } from '@commander-js/extra-typings';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import * as ipfsCmd from './commands/ipfs-upload';
import * as diffSnapshot from './commands/diff-snaphots';
import * as simulateProposal from './commands/simulate-proposal';
import { addCommand as addGovernanceV3 } from './commands/governance-v3';
import * as fork from './commands/fork';

// yargs(hideBin(process.argv))
//   .command(ipfsCmd)
//   .command(diffSnapshot)
//   .command(simulateProposal)
//   .command(fork)
//   .command(governanceV3)
//   .demandCommand().argv;

const program = new Command();

program.name('aave-cli').description('CLI to interact with the aave ecosystem').version('0.0.0').showHelpAfterError();
addGovernanceV3(program);

program.parse();
