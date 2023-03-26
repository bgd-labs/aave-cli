#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { diffReports } from "./diffReports";
import path from "path";

yargs(hideBin(process.argv))
  .scriptName("aave-report-engine")
  .usage("$0 <cmd> [args]")
  .command<{ from: string; to: string }>(
    "diff [from] [to]",
    "diffs two json reports",
    (yargs) => {
      yargs.positional("from", {
        type: "string",
        describe: "the initial json",
      });
      yargs.positional("to", {
        type: "string",
        describe: "the final json",
      });
    },
    function (argv) {
      const from = require(path.join(process.cwd(), argv.from));
      const to = require(path.join(process.cwd(), argv.to));
      console.log(diffReports(from, to));
    }
  )
  .help().argv;
