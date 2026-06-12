"use client";

import { createContext, useContext, useMemo } from "react";
import { makeT, DEFAULT_LOCALE } from "./index";

const LocaleContext = createContext({ locale: DEFAULT_LOCALE, dict: {} });

export function LocaleProvider({ locale, dict, children }) {
  // value-г memoize: provider дахин render болоход context хэрэглэгчид дэмий update авахгүй
  const value = useMemo(() => ({ locale, dict }), [locale, dict]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const { dict } = useContext(LocaleContext);
  // memoize: render бүрт шинэ t функц үүсгэвэл t-г dependency-д авсан effect-үүд
  // (useAction → QPayPay/BoostPay-ийн 6с poll) дахин эхэлж interval reset болдог байсан
  return useMemo(() => makeT(dict), [dict]);
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}
