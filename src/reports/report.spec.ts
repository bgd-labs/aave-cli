import { describe, expect, it } from "vitest";
import { readJsonFile } from "../utils/json";
import { diffReports } from "./diff-reports";

describe("report", () => {
  it(
    "should generate a well formatted report",
    async () => {
      const from = readJsonFile("/src/reports/mocks/preTestEngineArbV3.json");
      const to = readJsonFile("/src/reports/mocks/postTestEngineArbV3.json");
      const content = await diffReports(from, to);
      console.log(content);
      expect(content).toMatchSnapshot();
    },
    { timeout: 30000 },
  );
});
