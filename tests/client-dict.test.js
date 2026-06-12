// clientDict-ийн whitelist бүрэн эсэхийн хамгаалалт: "use client" файл бүрийн t("ns....")
// хэрэглээг скан хийж CLIENT_NAMESPACES-д бүгд байгааг баталгаажуулна. Шинэ client
// компонент шинэ namespace хэрэглэвэл энэ тест унаж, lib/i18n/clientDict.js-д нэмэхийг сануулна.
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { CLIENT_NAMESPACES, clientDict } from "@/lib/i18n/clientDict";
import { dictionaries } from "@/lib/i18n/dictionaries";

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

describe("clientDict whitelist", () => {
  it('"use client" файлуудын бүх t() namespace whitelist-д бий', () => {
    const used = new Set();
    for (const p of [...walk("components"), ...walk("app")]) {
      const s = readFileSync(p, "utf8");
      if (!s.trimStart().startsWith('"use client"')) continue;
      for (const m of s.matchAll(/t\("([a-zA-Z]+)\./g)) used.add(m[1]);
      for (const m of s.matchAll(/t\(`([a-zA-Z]+)\./g)) used.add(m[1]);
    }
    const missing = [...used].filter((ns) => !CLIENT_NAMESPACES.includes(ns));
    expect(missing, `lib/i18n/clientDict.js-д нэмэх: ${missing.join(", ")}`).toEqual([]);
  });

  it("whitelist-ийн namespace бүр dictionary-д бодитоор бий", () => {
    const ghost = CLIENT_NAMESPACES.filter((ns) => dictionaries.mn[ns] == null);
    expect(ghost).toEqual([]);
  });

  it("subset нь бүтнээсээ багадаа 20% жижиг", () => {
    const full = JSON.stringify(dictionaries.mn).length;
    const sub = JSON.stringify(clientDict(dictionaries.mn)).length;
    expect(sub).toBeLessThan(full * 0.8);
  });
});
