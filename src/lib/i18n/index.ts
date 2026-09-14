import type { Locale } from "../types";
import {
  applyDocumentLocale,
  detectLocale,
  normalizeLocale,
  persistLocale,
  readStoredLocale,
} from "./locale";
import type { Dict } from "./locales";
import { en, es } from "./locales";

export type { Locale } from "../types";
export type { Dict, PluralForms } from "./locales";
export {
  applyDocumentLocale,
  detectLocale,
  en,
  es,
  normalizeLocale,
  persistLocale,
  readStoredLocale,
};

export type TplVars = Record<string, string | number | boolean>;

function lookup(dict: Dict, key: string): unknown {
  if (Object.keys(dict).includes(key)) return dict[key];
  let current: unknown = dict;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function interpolate(
  template: string,
  vars: TplVars | undefined,
  activeInterpolationLocale: Locale,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined
      ? match
      : typeof value === "number"
        ? new Intl.NumberFormat(activeInterpolationLocale).format(value)
        : String(value);
  });
}

function countOf(vars?: TplVars): number {
  const raw = vars?.count;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function pickPlural(locale: Locale, count: number): string {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return "other";
  }
}

/** Resolves `key` for `locale` (opposite locale as fallback), then interpolates. */
export function translate(locale: Locale, key: string, vars?: TplVars): string {
  const primary = locale === "es" ? es : en;
  const fallback = locale === "es" ? en : es;
  const value = lookup(primary, key) ?? lookup(fallback, key);
  if (typeof value === "string") return interpolate(value, vars, locale);
  if (typeof value === "object" && value !== null) {
    const forms = value as Record<string, string>;
    const template =
      forms[pickPlural(locale, countOf(vars))] ?? forms.other ?? key;
    return interpolate(template, vars, locale);
  }
  return key;
}

/** Standalone `t` for non-React code. Inside React prefer `useI18n().t`. */
export function t(locale: Locale, key: string, vars?: TplVars): string {
  return translate(locale, key, vars);
}

export function formatNumberFor(
  locale: Locale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatDateFor(
  locale: Locale,
  value: number | Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(value);
}

const RELATIVE_UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 31_556_952],
  ["month", 2_629_746],
  ["week", 604_800],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

export function formatRelativeTime(
  locale: Locale,
  value: number | Date,
  now: number = Date.now(),
): string {
  const ts = value instanceof Date ? value.getTime() : value;
  const deltaSeconds = (ts - now) / 1000;
  const abs = Math.abs(deltaSeconds);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, seconds] of RELATIVE_UNITS) {
    if (abs >= seconds || unit === "second") {
      return formatter.format(Math.round(deltaSeconds / seconds), unit);
    }
  }
  return formatter.format(0, "second");
}
