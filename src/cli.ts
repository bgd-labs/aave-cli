#!/usr/bin/env node
import 'dotenv/config';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import * as ipfsCmd from './commands/ipfs-upload';
import * as diffSnapshot from './commands/diff-snaphots';
import * as simulateProposal from './commands/simulate-proposal';
import * as fork from './commands/fork';

yargs(hideBin(process.argv))
  .command(ipfsCmd)
  .command(diffSnapshot)
  .command(simulateProposal)
  .command(fork)
  .demandCommand().argv;
