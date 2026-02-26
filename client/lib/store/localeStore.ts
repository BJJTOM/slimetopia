import { create } from "zustand";
import { type Locale, translate } from "@/lib/i18n/translations";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const getStoredLocale = (): Locale => {
  if (typeof window === "undefined") return "auto";
  return (localStorage.getItem("app_locale") as Locale) || "auto";
};

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: getStoredLocale(),

  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("app_locale", locale);
    }
    set({ locale });
  },

  t: (key) => translate(get().locale, key),
}));
