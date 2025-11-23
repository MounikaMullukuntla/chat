/**
 * Example unit test demonstrating test structure
 * This file serves as a template for writing unit tests
 */

import { describe, expect, it } from "vitest";

describe("Example Test Suite", () => {
  it("should pass a basic assertion", () => {
    expect(true).toBe(true);
  });

  it("should perform arithmetic correctly", () => {
    expect(1 + 1).toBe(2);
    expect(5 * 2).toBe(10);
  });

  describe("nested test group", () => {
    it("should handle strings", () => {
      expect("hello").toBe("hello");
      expect("world".toUpperCase()).toBe("WORLD");
    });

    it("should handle arrays", () => {
      const arr = [1, 2, 3];
      expect(arr).toHaveLength(3);
      expect(arr).toContain(2);
    });
  });
});
