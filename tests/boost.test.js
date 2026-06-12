import { describe, it, expect } from "vitest";
import { BOOST, MODIFIERS, RANK_CUM, RANK_LADDER, rankMatches, bulkDiscount, boostTotal } from "@/lib/boost";

describe("rankMatches", () => {
  it("ижил болон урвуу ранкад 0", () => {
    expect(rankMatches(3, 3)).toBe(0);
    expect(rankMatches(5, 2)).toBe(0);
    expect(rankMatches(null, 4)).toBe(0);
    expect(rankMatches(2, null)).toBe(0);
  });
  it("кумулятив зөрүүгээр тооцно", () => {
    // Warrior(0) → Elite(1): STEP_MATCHES[1] = 2
    expect(rankMatches(0, 1)).toBe(RANK_CUM[1] - RANK_CUM[0]);
    // бүх шатыг дамжсан нийлбэр = сүүлийн кумулятив
    expect(rankMatches(0, RANK_LADDER.length - 1)).toBe(RANK_CUM[RANK_CUM.length - 1]);
  });
});

describe("bulkDiscount", () => {
  it("босгууд", () => {
    expect(bulkDiscount(9)).toBe(0);
    expect(bulkDiscount(10)).toBe(0.05);
    expect(bulkDiscount(19)).toBe(0.05);
    expect(bulkDiscount(20)).toBe(0.1);
    expect(bulkDiscount(40)).toBe(0.15);
    expect(bulkDiscount(-5)).toBe(0);
  });
});

describe("boostTotal", () => {
  it("суурь үнэ — бүхэл ₮", () => {
    expect(boostTotal(5, BOOST.winrate.perMatch)).toBe(5 * 6000);
  });
  it("express + duo коэффициент", () => {
    const total = boostTotal(5, 6000, { express: true, duo: true });
    expect(total).toBe(Math.round(5 * 6000 * (1 + MODIFIERS.express + MODIFIERS.duo)));
  });
  it("bulk хямдрал нийт дүнгээс суудаг", () => {
    expect(boostTotal(10, 6000)).toBe(Math.round(10 * 6000 * 0.95));
  });
  it("сөрөг/бутархай оролтыг хамгаална", () => {
    expect(boostTotal(-3, 6000)).toBe(0);
    expect(boostTotal(2.4, 6000)).toBe(2 * 6000);
  });
});
