import type { Dict, PluralForms } from "./es";

const plural: PluralForms = { one: "", other: "" };

export const en: Dict = {
  common: {
    retry: "",
    close: "",
    cancel: "",
    save: "",
    loading: "",
    repos: { ...plural },
    stars: { ...plural },
    downloads: { ...plural },
  },
  nav: {
    dashboard: "",
    repos: "",
    create: "",
    settings: "",
  },
  settings: {
    title: "",
    language: "",
    languageDescription: "",
    spanish: "",
    english: "",
    appearance: "",
    theme: "",
    themeLight: "",
    themeDark: "",
    themeSystem: "",
    transparency: "",
    transparencyDescription: "",
    account: "",
    diagnostics: "",
    diagnosticsDescription: "",
    ghVersion: "",
    gitVersion: "",
    configPath: "",
    cachePath: "",
    historyPath: "",
    unavailable: "",
  },
  errors: {
    generic: "",
    offline: "",
    ghMissing: "",
    ghAuth: "",
    network: "",
  },
  empty: {
    noRepos: "",
    noReposHint: "",
    noResults: "",
  },
  a11y: {
    close: "",
    openSettings: "",
    retry: "",
  },
};
