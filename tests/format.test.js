import { describe, it, expect } from "vitest";
import { formatMNT, formatDateTime, timeLeft } from "@/lib/format";

describe("formatMNT", () => {
  it("бүхэл ₮ + мянгатын хуваарь", () => {
    expect(formatMNT(5000000, "en")).toBe("5,000,000₮");
    expect(formatMNT(0, "en")).toBe("0₮");
  });
  it("null → —", () => {
    expect(formatMNT(null)).toBe("—");
    expect(formatMNT(undefined)).toBe("—");
  });
});

describe("formatDateTime", () => {
  it("УБ-ын цагийн бүсэд тогтмол (server/client ижил гаралт — hydration аюулгүй)", () => {
    // 2026-01-01T00:00:00Z = УБ-д 2026-01-01 08:00
    const out = formatDateTime("2026-01-01T00:00:00Z", "en");
    expect(out).toContain("2026");
    expect(out).toContain("8:00");
  });
  it("хоосон утга → —", () => {
    expect(formatDateTime(null)).toBe("—");
  });
  it("буруу утгад уналгүй буцаана", () => {
    expect(typeof formatDateTime("garbage")).toBe("string");
  });
});

describe("timeLeft", () => {
  it("өнгөрсөн хугацаа", () => {
    expect(timeLeft(new Date(Date.now() - 1000).toISOString(), "en")).toBe("Expired");
    expect(timeLeft(new Date(Date.now() - 1000).toISOString(), "mn")).toBe("Хугацаа дууссан");
  });
  it("ирээдүйн хугацаа ц/м-ээр", () => {
    const ends = new Date(Date.now() + 3 * 3600_000 + 30 * 60_000).toISOString();
    expect(timeLeft(ends, "en")).toMatch(/^3h (29|30)m left$/);
  });
  it("null → null", () => {
    expect(timeLeft(null)).toBe(null);
  });
});
