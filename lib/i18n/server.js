import { cookies } from "next/headers";
import { dictionaries, makeT, normalizeLocale } from "./index";

export const LOCALE_COOKIE = "locale";

// Server Component-уудад: cookie-аас locale уншина (Next 16: cookies() async).
export async function getLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export async function getDict() {
  const locale = await getLocale();
  return dictionaries[locale];
}

export async function getT() {
  const dict = await getDict();
  return makeT(dict);
}
