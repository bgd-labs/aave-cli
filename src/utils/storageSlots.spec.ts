import { describe, expect, it } from "vitest";
import { setBits } from "./storageSlots";

describe("solidityUtils", () => {
  it("setBits", async () => {
    expect(setBits("0b11", 1n, 2n, 0n)).toBe(1n);
    expect(setBits("0b111", 1n, 2n, 0n)).toBe(5n);
    expect(setBits("0b111", 1n, 3n, 0n)).toBe(1n);
    expect(setBits("0b111", 0n, 3n, 0n)).toBe(0n);
  });
});
