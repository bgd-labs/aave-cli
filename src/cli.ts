#!/usr/bin/env node
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { diffReports } from "./diffReports";
import { readJson } from "./utils/json";
import fs from "fs";

yargs(hideBin(process.argv))
  .scriptName("aave-report-engine")
  .usage("$0 <cmd> [args]")
  .command<{ from: string; to: string; out: string }>(
    "diff [from] [to] [out]",
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
      yargs.positional("out", {
        type: "string",
        describe: "the output path & filename",
      });
    },
    async function (argv) {
      const from = readJson(argv.from);
      const to = readJson(argv.to);
      const content = await diffReports(from, to);
      fs.writeFileSync(argv.out, content);
    }
  )
  .help().argv;
