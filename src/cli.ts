#!/usr/bin/env node
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import * as ipfsCmd from "./commands/ipfs";
import * as diffSnapshot from "./commands/diff-snaphots";

yargs(hideBin(process.argv))
  .command(ipfsCmd)
  .command(diffSnapshot)
  .demandCommand()
  .help().argv;
