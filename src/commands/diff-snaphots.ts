import { diffReports } from "../diffReports";
import { readJsonString, readJsonFile } from "../utils/json";
import fs from "fs";

export const command = "diff-snapshots [from] [to]";

export const describe =
  "diffs two json snapshots and generates a markdown report";

export const builder = (yargs) =>
  yargs
    .option("out", {
      type: "string",
      describe: "write file to out path",
    })
    .option("stringMode", {
      type: "boolean",
      describe: "assumes in/out to be string instead of files",
      default: false,
    });

export const handler = async function (argv) {
  const from = argv.stringMode
    ? readJsonString(argv.from)
    : readJsonFile(argv.from);
  const to = argv.stringMode ? readJsonString(argv.to) : readJsonFile(argv.to);
  const content = await diffReports(from, to);
  if (argv.out) {
    fs.writeFileSync(argv.out, content);
  } else {
    console.log(content);
  }
};
