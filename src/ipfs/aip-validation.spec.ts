import { describe, it, expect } from "vitest";
import { validateAIPHeader } from "./aip-validation";
import { ZodError } from "zod";

describe("validateAIP", () => {
  it("should succeed when all keys are present", () => {
    const header = `---
title: TestTitle
discussions: testDiscussion
author: Llama (Fermin Carranza, TokenLogic)
---`;
    expect(validateAIPHeader(header)).toBe("TestTitle");
  });

  it("should throw when required key is missing", () => {
    const header = `---
title: TestTitle
discussions: testDiscussion
---`;
    expect(() => validateAIPHeader(header)).toThrow();
  });
});
