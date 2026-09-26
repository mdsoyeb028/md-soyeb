import { en, TranslationSchema } from "./en";
import { hi } from "./hi";
import { bn } from "./bn";
import { ur } from "./ur";
import { ar } from "./ar";
import { es } from "./es";
import { fr } from "./fr";
import { de } from "./de";
import { pt } from "./pt";
import { zh } from "./zh";
import { ja } from "./ja";

export type { TranslationSchema };

export const TRANSLATIONS: Record<string, Partial<TranslationSchema>> = {
  en,
  hi,
  bn,
  ur,
  ar,
  es,
  fr,
  de,
  pt,
  "pt-BR": pt,
  "pt-PT": pt,
  "zh-CN": zh,
  "zh-TW": zh,
  zh,
  ja,
  "es-ES": es,
  "es-MX": es,
  "en-US": en,
  "en-GB": en,
};

/**
 * Gets nested translation string safely.
 * If translation key is missing in the chosen language, cleanly falls back to English.
 * Guaranteed to NEVER return null, undefined, [object Object], or "missing.key".
 */
export function getTranslation(
  langCode: string,
  keyPath: string,
  fallbackDefault?: string,
  variables?: Record<string, string | number>
): string {
  if (!keyPath) return fallbackDefault || "";

  const keys = keyPath.split(".");
  const currentLang = (langCode || "en").toLowerCase();

  // Try exact locale match, then base match (e.g. 'pt-br' -> 'pt'), then 'en'
  const langKey = Object.keys(TRANSLATIONS).find(k => k.toLowerCase() === currentLang)
    || Object.keys(TRANSLATIONS).find(k => k.toLowerCase() === currentLang.split("-")[0])
    || "en";

  const targetDict = TRANSLATIONS[langKey] || en;
  const englishDict = en;

  let val: any = targetDict;
  for (const k of keys) {
    if (val && typeof val === "object" && k in val) {
      val = val[k];
    } else {
      val = undefined;
      break;
    }
  }

  // Fallback to English if missing or not a string
  if (val === undefined || typeof val !== "string") {
    let engVal: any = englishDict;
    for (const k of keys) {
      if (engVal && typeof engVal === "object" && k in engVal) {
        engVal = engVal[k];
      } else {
        engVal = undefined;
        break;
      }
    }
    val = (typeof engVal === "string") ? engVal : (fallbackDefault || keys[keys.length - 1]);
  }

  let result = String(val);

  // Variable replacement if provided
  if (variables && typeof variables === "object") {
    for (const [varName, varVal] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{${varName}\\}`, "g"), String(varVal));
    }
  }

  return result;
}
