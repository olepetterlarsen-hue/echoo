import type { Locale } from "./index";
import type { TranslationDict } from "./strings/types";
import { COMMON } from "./strings/common";
import { DASHBOARD } from "./strings/dashboard";
import { PROJECTS } from "./strings/projects";
import { PLANNER } from "./strings/planner";
import { QUALITY } from "./strings/quality";
import { ADMIN } from "./strings/admin";
import { AUTH } from "./strings/auth";

export const S: TranslationDict = {
  ...COMMON,
  ...DASHBOARD,
  ...PROJECTS,
  ...PLANNER,
  ...QUALITY,
  ...ADMIN,
  ...AUTH,
};

export type StringKey = keyof typeof S;

export function tr(key: keyof typeof S, locale: Locale) {
  return S[key][locale];
}
