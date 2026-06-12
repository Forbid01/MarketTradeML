import { describe, it, expect } from "vitest";
import { sellerTier } from "@/lib/sellerTier";

describe("sellerTier", () => {
  it("босго бүрийн зөв түвшин", () => {
    expect(sellerTier(0).key).toBe("rookie");
    expect(sellerTier(1).key).toBe("active");
    expect(sellerTier(4).key).toBe("active");
    expect(sellerTier(5).key).toBe("trusted");
    expect(sellerTier(20).key).toBe("elite");
    expect(sellerTier(50).key).toBe("legend");
    expect(sellerTier(999).key).toBe("legend");
  });
  it("буруу оролтод rookie", () => {
    expect(sellerTier(undefined).key).toBe("rookie");
    expect(sellerTier("garbage").key).toBe("rookie");
  });
});
