import enCommon from "./locales/en/common.json";
import enCreate from "./locales/en/create.json";
import enDetail from "./locales/en/detail.json";
import enList from "./locales/en/list.json";
import enPicker from "./locales/en/picker.json";
import enSettings from "./locales/en/settings.json";
import enSetup from "./locales/en/setup.json";
import esCommon from "./locales/es/common.json";
import esCreate from "./locales/es/create.json";
import esDetail from "./locales/es/detail.json";
import esList from "./locales/es/list.json";
import esPicker from "./locales/es/picker.json";
import esSettings from "./locales/es/settings.json";
import esSetup from "./locales/es/setup.json";

export type PluralForms = { one?: string; other: string };
export type Dict = {
  [key: string]: string | PluralForms | Dict;
};

function composeLocale(sections: Record<string, Dict>): Dict {
  const locale = Object.assign({}, ...Object.values(sections)) as Dict;
  for (const [name, section] of Object.entries(sections)) {
    locale[name] = section;
  }
  return locale;
}

export const en = composeLocale({
  common: enCommon,
  list: enList,
  detail: enDetail,
  picker: enPicker,
  create: enCreate,
  setup: enSetup,
  settings: enSettings,
});

export const es = composeLocale({
  common: esCommon,
  list: esList,
  detail: esDetail,
  picker: esPicker,
  create: esCreate,
  setup: esSetup,
  settings: esSettings,
});
