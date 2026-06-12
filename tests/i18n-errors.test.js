import { describe, it, expect } from "vitest";
import { errorKey } from "@/lib/i18n/errors";
import { dictionaries } from "@/lib/i18n/dictionaries";

// dict-ийг бүтнээр нь хавтгайруулна (nested → "ns.key" жагсаалт)
const flat = (o, p = "") =>
  Object.entries(o).flatMap(([k, v]) =>
    v && typeof v === "object" && !Array.isArray(v) ? flat(v, p + k + ".") : [p + k]
  );

describe("errorKey mapping", () => {
  it("exact тааруулалт (action + plpgsql)", () => {
    expect(errorKey("Нэвтэрнэ үү")).toBe("notLoggedIn");
    expect(errorKey("зөвхөн админ")).toBe("adminOnly");
    expect(errorKey("Зөвхөн админ")).toBe("adminOnly");
    expect(errorKey("Промо код хүчингүй байна")).toBe("badPromo");
  });
  it("динамик plpgsql мессежид prefix дүрэм", () => {
    expect(errorKey("шилжилт created -> paid зөвшөөрөгдөхгүй")).toBe("badTransition");
    expect(errorKey("захиалга эцсийн төлөвт (completed), шилжилт хориотой")).toBe("terminalState");
    expect(errorKey("зөвхөн дууссан boost-д олголт (одоо: paid)")).toBe("boostNotCompleted");
  });
  it("үл таних мессеж null (raw хэвээр харагдана)", () => {
    expect(errorKey("тодорхойгүй алдаа")).toBe(null);
    expect(errorKey("")).toBe(null);
    expect(errorKey(undefined)).toBe(null);
  });
  it("map-ласан БҮХ key хоёр хэлний errors namespace-д бий", () => {
    // exact map + prefix map-ийн бүх key-г errorKey-ээр шууд шалгахын оронд
    // dictionaries-ийн errors namespace дотор тус бүр string утгатайг баталгаажуулна
    const sampleMsgs = [
      "Нэвтэрнэ үү", "Хэт олон хүсэлт. Түр хүлээгээд дахин оролдоно уу.",
      "Захиалга олдсонгүй / эрх алга", "зар олдсонгүй", "өөрийн зарыг худалдаж авах боломжгүй",
      "шилжүүлгийн checklist бүрэн биш — дуусгах боломжгүй", "booster хуваарилаагүй байна",
      "шилжилт a -> b зөвшөөрөгдөхгүй", "захиалга эцсийн төлөвт (x), шилжилт хориотой",
      "checklist-ийг зөвхөн шилжүүлэг үед", "И-мэйл хаяг буруу байна",
    ];
    for (const msg of sampleMsgs) {
      const key = errorKey(msg);
      expect(key, msg).toBeTruthy();
      expect(typeof dictionaries.mn.errors[key], `mn errors.${key}`).toBe("string");
      expect(typeof dictionaries.en.errors[key], `en errors.${key}`).toBe("string");
    }
  });
});

describe("i18n dictionary parity", () => {
  it("MN/EN түлхүүрүүд 1:1", () => {
    const mn = new Set(flat(dictionaries.mn));
    const en = new Set(flat(dictionaries.en));
    expect([...mn].filter((k) => !en.has(k))).toEqual([]);
    expect([...en].filter((k) => !mn.has(k))).toEqual([]);
  });
  it("массив утгууд ижил урттай (ж: listingForm.steps)", () => {
    const walk = (a, b, p = "") => {
      for (const [k, v] of Object.entries(a)) {
        if (Array.isArray(v)) expect(b[k]?.length, p + k).toBe(v.length);
        else if (v && typeof v === "object") walk(v, b[k] ?? {}, p + k + ".");
      }
    };
    walk(dictionaries.mn, dictionaries.en);
  });
});
