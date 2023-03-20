import { describe, it } from "vitest";

// The two tests marked with concurrent will be run in parallel
describe("diffReports", () => {
  it("concurrent test 1", async ({ expect }) => {
    expect(true).eq(true);
  });
});
