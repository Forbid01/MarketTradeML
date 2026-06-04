"use client";

import { createContext, useContext } from "react";
import { makeT, DEFAULT_LOCALE } from "./index";

const LocaleContext = createContext({ locale: DEFAULT_LOCALE, dict: {} });

export function LocaleProvider({ locale, dict, children }) {
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

export function useT() {
  const { dict } = useContext(LocaleContext);
  return makeT(dict);
}

export function useLocale() {
  return useContext(LocaleContext).locale;
}
