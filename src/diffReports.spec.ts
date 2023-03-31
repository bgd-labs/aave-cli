import { describe, it } from "vitest";
import { diffReports } from "./diffReports";
import { readJson } from "./utils/json";

// The two tests marked with concurrent will be run in parallel
describe("diffReports", () => {
  it("Should generate proper diff", async ({ expect }) => {
    const from = readJson("./src/mocks/preTestEngineArbV3.json");
    const to = readJson("./src/mocks/postTestEngineArbV3.json");
    const content = diffReports(from, to);
    console.log(content);
  });
});
