import { describe, it, expect } from "vitest";
import { roleAtLeast } from "./role-rank";

describe("roleAtLeast", () => {
  it("ranks OWNER above ADMIN above MEMBER above VIEWER", () => {
    expect(roleAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(roleAtLeast("ADMIN", "MEMBER")).toBe(true);
    expect(roleAtLeast("MEMBER", "VIEWER")).toBe(true);
    expect(roleAtLeast("VIEWER", "MEMBER")).toBe(false);
    expect(roleAtLeast("MEMBER", "ADMIN")).toBe(false);
  });

  it("treats equal roles as satisfying the requirement", () => {
    expect(roleAtLeast("ADMIN", "ADMIN")).toBe(true);
  });
});
