export type PluralForms = {
  zero?: string;
  one?: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

export type Dict = {
  common: {
    retry: string;
    close: string;
    cancel: string;
    save: string;
    loading: string;
    repos: PluralForms;
    stars: PluralForms;
    downloads: PluralForms;
  };
  nav: {
    dashboard: string;
    repos: string;
    create: string;
    settings: string;
  };
  settings: {
    title: string;
    language: string;
    languageDescription: string;
    spanish: string;
    english: string;
    appearance: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    transparency: string;
    transparencyDescription: string;
    account: string;
    diagnostics: string;
    diagnosticsDescription: string;
    ghVersion: string;
    gitVersion: string;
    configPath: string;
    cachePath: string;
    historyPath: string;
    unavailable: string;
  };
  errors: {
    generic: string;
    offline: string;
    ghMissing: string;
    ghAuth: string;
    network: string;
  };
  empty: {
    noRepos: string;
    noReposHint: string;
    noResults: string;
  };
  a11y: {
    close: string;
    openSettings: string;
    retry: string;
  };
};

const plural: PluralForms = { one: "", other: "" };

export const es: Dict = {
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
