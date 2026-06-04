import { dictionaries, DEFAULT_LOCALE, LOCALES } from "./dictionaries";

export { dictionaries, DEFAULT_LOCALE, LOCALES };

// dict дотроос dotted key (ж: "home.title")-ийг авах t функц үүсгэнэ.
// Олдохгүй бол key-г буцаана. {var} орлуулалт дэмжинэ.
export function makeT(dict) {
  return (key, vars) => {
    let val = String(key)
      .split(".")
      .reduce((o, k) => (o != null && o[k] != null ? o[k] : null), dict);
    if (val == null) return key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        val = String(val).replaceAll(`{${k}}`, String(v));
      }
    }
    return val;
  };
}

export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}
