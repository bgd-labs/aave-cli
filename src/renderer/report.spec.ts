import { describe, it, expect } from "vitest";
import { diffReports } from "../diffReports";
import { readJson } from "../utils/json";

describe("report", () => {
  it("should generate a well formatted report", async () => {
    const from = readJson("/src/mocks/preTestEngineArbV3.json");
    const to = readJson("/src/mocks/postTestEngineArbV3.json");
    const content = await diffReports(from, to);
    expect(content).toMatchSnapshot();
  });
});
