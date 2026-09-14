import { useCallback, useMemo } from "react";
import { useStore } from "@/app/store";
import {
  formatDateFor,
  formatRelativeTime,
  type TplVars,
  translate,
} from "@/lib/i18n";
import type { Locale } from "@/lib/types";

export type I18n = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: TplVars) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (
    value: number | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatRelative: (value: number | Date, now?: number) => string;
};

export function useI18n(): I18n {
  const locale = useStore((s) => s.locale);
  const setLocale = useStore((s) => s.setLocale);

  const boundT = useCallback(
    (key: string, vars?: TplVars) => translate(locale, key, vars),
    [locale],
  );
  const numberFormatter = useMemo(
    () => new Intl.NumberFormat(locale),
    [locale],
  );
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      options
        ? new Intl.NumberFormat(locale, options).format(value)
        : numberFormatter.format(value),
    [locale, numberFormatter],
  );
  const formatDate = useCallback(
    (value: number | Date, options?: Intl.DateTimeFormatOptions) =>
      formatDateFor(locale, value, options),
    [locale],
  );
  const formatRelative = useCallback(
    (value: number | Date, now?: number) =>
      formatRelativeTime(locale, value, now),
    [locale],
  );

  return {
    locale,
    setLocale,
    t: boundT,
    formatNumber,
    formatDate,
    formatRelative,
  };
}
