import JSONbig from "json-bigint";
import fs from "fs";
import path from "path";

export function readJson(filePath: string) {
  const content = fs.readFileSync(path.join(process.cwd(), filePath));
  return JSON.parse(
    JSON.stringify(JSONbig({ storeAsString: true }).parse(content))
  );
}
