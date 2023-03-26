import { describe, it } from "vitest";
import { diffReports } from "./diffReports";
import preTestEngineArbV3 from "./mocks/preTestEngineArbV3.json";
import postTestEngineArbV3 from "./mocks/postTestEngineArbV3.json";

// The two tests marked with concurrent will be run in parallel
describe("diffReports", () => {
  it("Should generate proper diff", async ({ expect }) => {
    const content = diffReports(preTestEngineArbV3, postTestEngineArbV3);
    console.log(content);
  });
});
