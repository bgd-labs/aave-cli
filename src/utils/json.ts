import JSONbig from "json-bigint";
import fs from "fs";
import path from "path";

export function readJsonString(content: string) {
  return JSON.parse(
    JSON.stringify(JSONbig({ storeAsString: true }).parse(content))
  );
}

export function readJsonFile(filePath: string) {
  const content = fs.readFileSync(path.join(process.cwd(), filePath), "utf8");
  return readJsonString(content);
}
