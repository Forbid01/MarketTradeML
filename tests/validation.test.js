import { describe, it, expect } from "vitest";
import { isUuid, listingSchema } from "@/lib/validation";
import { RANKS, SERVERS } from "@/lib/constants";

describe("isUuid", () => {
  it("зөв UUID (жижиг/том үсэг)", () => {
    expect(isUuid("d7f6675d-a716-460a-9042-0b99d9d6fe0c")).toBe(true);
    expect(isUuid("D7F6675D-A716-460A-9042-0B99D9D6FE0C")).toBe(true);
  });
  it("буруу утгууд", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("")).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid("d7f6675d-a716-460a-9042-0b99d9d6fe0")).toBe(false); // дутуу
    expect(isUuid("1; drop table users;--")).toBe(false);
  });
});

describe("listingSchema", () => {
  const valid = {
    title: "Mythic 640 star",
    price: 500000,
    server: SERVERS[0],
    rank: RANKS[0],
  };
  it("зөв payload", () => {
    expect(listingSchema.safeParse(valid).success).toBe(true);
  });
  it("үнийн хязгаар", () => {
    expect(listingSchema.safeParse({ ...valid, price: 0 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, price: -5 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, price: 2_000_000_000 }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, price: 10.5 }).success).toBe(false);
  });
  it("гарчгийн урт", () => {
    expect(listingSchema.safeParse({ ...valid, title: "ab" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, title: "x".repeat(141) }).success).toBe(false);
  });
  it("rank/server цагаан жагсаалт", () => {
    expect(listingSchema.safeParse({ ...valid, rank: "FakeRank" }).success).toBe(false);
    expect(listingSchema.safeParse({ ...valid, server: "Mars" }).success).toBe(false);
  });
});
