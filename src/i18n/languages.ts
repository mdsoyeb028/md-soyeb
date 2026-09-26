export type TextDirection = "ltr" | "rtl";

export type LanguageRegion = 
  | "Recommended"
  | "South Asia"
  | "Middle East & West Asia"
  | "Europe"
  | "East & Southeast Asia"
  | "Africa"
  | "Americas"
  | "Other";

export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  direction: TextDirection;
  region: LanguageRegion;
  popular?: boolean;
}

export const WORLD_LANGUAGES: LanguageInfo[] = [
  // --- POPULAR / RECOMMENDED WORLD LANGUAGES ---
  { code: "en", name: "English", nativeName: "English", direction: "ltr", region: "Europe", popular: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", direction: "ltr", region: "South Asia", popular: true },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", direction: "ltr", region: "South Asia", popular: true },
  { code: "ur", name: "Urdu", nativeName: "اردو", direction: "rtl", region: "South Asia", popular: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", direction: "rtl", region: "Middle East & West Asia", popular: true },
  { code: "es", name: "Spanish", nativeName: "Español", direction: "ltr", region: "Europe", popular: true },
  { code: "fr", name: "French", nativeName: "Français", direction: "ltr", region: "Europe", popular: true },
  { code: "de", name: "German", nativeName: "Deutsch", direction: "ltr", region: "Europe", popular: true },
  { code: "pt", name: "Portuguese", nativeName: "Português", direction: "ltr", region: "Europe", popular: true },
  { code: "ru", name: "Russian", nativeName: "Русский", direction: "ltr", region: "Europe", popular: true },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "zh-TW", name: "Chinese (Traditional)", nativeName: "繁體中文", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "ja", name: "Japanese", nativeName: "日本語", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "ko", name: "Korean", nativeName: "한국어", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "id", name: "Indonesian", nativeName: "Bahasa Indonesia", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", direction: "ltr", region: "Middle East & West Asia", popular: true },
  { code: "fa", name: "Persian (Farsi)", nativeName: "فارسی", direction: "rtl", region: "Middle East & West Asia", popular: true },
  { code: "it", name: "Italian", nativeName: "Italiano", direction: "ltr", region: "Europe", popular: true },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "th", name: "Thai", nativeName: "ไทย", direction: "ltr", region: "East & Southeast Asia", popular: true },
  { code: "sw", name: "Swahili", nativeName: "Kiswahili", direction: "ltr", region: "Africa", popular: true },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", direction: "ltr", region: "South Asia", popular: true },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", direction: "ltr", region: "South Asia", popular: true },

  // --- REGIONAL VARIANTS ---
  { code: "en-US", name: "English (US)", nativeName: "English (US)", direction: "ltr", region: "Americas" },
  { code: "en-GB", name: "English (UK)", nativeName: "English (UK)", direction: "ltr", region: "Europe" },
  { code: "pt-BR", name: "Portuguese (Brazil)", nativeName: "Português (Brasil)", direction: "ltr", region: "Americas" },
  { code: "pt-PT", name: "Portuguese (Portugal)", nativeName: "Português (Portugal)", direction: "ltr", region: "Europe" },
  { code: "es-ES", name: "Spanish (Spain)", nativeName: "Español (España)", direction: "ltr", region: "Europe" },
  { code: "es-MX", name: "Spanish (Mexico)", nativeName: "Español (México)", direction: "ltr", region: "Americas" },

  // --- SOUTH ASIA ---
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", direction: "ltr", region: "South Asia" },
  { code: "bho", name: "Bhojpuri", nativeName: "भोजपुरी", direction: "ltr", region: "South Asia" },
  { code: "brx", name: "Bodo", nativeName: "बर'", direction: "ltr", region: "South Asia" },
  { code: "dv", name: "Dhivehi (Maldivian)", nativeName: "ދިވެހި", direction: "rtl", region: "South Asia" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", direction: "ltr", region: "South Asia" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", direction: "ltr", region: "South Asia" },
  { code: "ks", name: "Kashmiri", nativeName: "کٲشُر", direction: "rtl", region: "South Asia" },
  { code: "kok", name: "Konkani", nativeName: "कोंकणी", direction: "ltr", region: "South Asia" },
  { code: "mai", name: "Maithili", nativeName: "मैथिली", direction: "ltr", region: "South Asia" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", direction: "ltr", region: "South Asia" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", direction: "ltr", region: "South Asia" },
  { code: "mni", name: "Meitei (Manipuri)", nativeName: "মৈতৈলোন্", direction: "ltr", region: "South Asia" },
  { code: "ne", name: "Nepali", nativeName: "नेपाली", direction: "ltr", region: "South Asia" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", direction: "ltr", region: "South Asia" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", direction: "ltr", region: "South Asia" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", direction: "ltr", region: "South Asia" },
  { code: "sd", name: "Sindhi", nativeName: "سنڌي", direction: "rtl", region: "South Asia" },
  { code: "si", name: "Sinhala", nativeName: "සිංහල", direction: "ltr", region: "South Asia" },

  // --- EUROPE ---
  { code: "sq", name: "Albanian", nativeName: "Shqip", direction: "ltr", region: "Europe" },
  { code: "eu", name: "Basque", nativeName: "Euskara", direction: "ltr", region: "Europe" },
  { code: "be", name: "Belarusian", nativeName: "Беларуская", direction: "ltr", region: "Europe" },
  { code: "bs", name: "Bosnian", nativeName: "Bosanski", direction: "ltr", region: "Europe" },
  { code: "bg", name: "Bulgarian", nativeName: "Български", direction: "ltr", region: "Europe" },
  { code: "ca", name: "Catalan", nativeName: "Català", direction: "ltr", region: "Europe" },
  { code: "hr", name: "Croatian", nativeName: "Hrvatski", direction: "ltr", region: "Europe" },
  { code: "cs", name: "Czech", nativeName: "Čeština", direction: "ltr", region: "Europe" },
  { code: "da", name: "Danish", nativeName: "Dansk", direction: "ltr", region: "Europe" },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", direction: "ltr", region: "Europe" },
  { code: "et", name: "Estonian", nativeName: "Eesti", direction: "ltr", region: "Europe" },
  { code: "fi", name: "Finnish", nativeName: "Suomi", direction: "ltr", region: "Europe" },
  { code: "gl", name: "Galician", nativeName: "Galego", direction: "ltr", region: "Europe" },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", direction: "ltr", region: "Europe" },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", direction: "ltr", region: "Europe" },
  { code: "is", name: "Icelandic", nativeName: "Íslenska", direction: "ltr", region: "Europe" },
  { code: "ga", name: "Irish", nativeName: "Gaeilge", direction: "ltr", region: "Europe" },
  { code: "lv", name: "Latvian", nativeName: "Latviešu", direction: "ltr", region: "Europe" },
  { code: "lt", name: "Lithuanian", nativeName: "Lietuvių", direction: "ltr", region: "Europe" },
  { code: "lb", name: "Luxembourgish", nativeName: "Lëtzebuergesch", direction: "ltr", region: "Europe" },
  { code: "mk", name: "Macedonian", nativeName: "Македонски", direction: "ltr", region: "Europe" },
  { code: "mt", name: "Maltese", nativeName: "Malti", direction: "ltr", region: "Europe" },
  { code: "no", name: "Norwegian", nativeName: "Norsk", direction: "ltr", region: "Europe" },
  { code: "pl", name: "Polish", nativeName: "Polski", direction: "ltr", region: "Europe" },
  { code: "ro", name: "Romanian", nativeName: "Română", direction: "ltr", region: "Europe" },
  { code: "sr", name: "Serbian", nativeName: "Српски", direction: "ltr", region: "Europe" },
  { code: "sk", name: "Slovak", nativeName: "Slovenčina", direction: "ltr", region: "Europe" },
  { code: "sl", name: "Slovenian", nativeName: "Slovenščina", direction: "ltr", region: "Europe" },
  { code: "sv", name: "Swedish", nativeName: "Svenska", direction: "ltr", region: "Europe" },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", direction: "ltr", region: "Europe" },
  { code: "cy", name: "Welsh", nativeName: "Cymraeg", direction: "ltr", region: "Europe" },

  // --- MIDDLE EAST & WEST ASIA ---
  { code: "he", name: "Hebrew", nativeName: "עברית", direction: "rtl", region: "Middle East & West Asia" },
  { code: "hy", name: "Armenian", nativeName: "Հայերեն", direction: "ltr", region: "Middle East & West Asia" },
  { code: "az", name: "Azerbaijani", nativeName: "Azərbaycan", direction: "ltr", region: "Middle East & West Asia" },
  { code: "ka", name: "Georgian", nativeName: "ქართული", direction: "ltr", region: "Middle East & West Asia" },
  { code: "kk", name: "Kazakh", nativeName: "Қазақша", direction: "ltr", region: "Middle East & West Asia" },
  { code: "ky", name: "Kyrgyz", nativeName: "Кыргызча", direction: "ltr", region: "Middle East & West Asia" },
  { code: "tg", name: "Tajik", nativeName: "Тоҷикӣ", direction: "ltr", region: "Middle East & West Asia" },
  { code: "tk", name: "Turkmen", nativeName: "Türkmençe", direction: "ltr", region: "Middle East & West Asia" },
  { code: "uz", name: "Uzbek", nativeName: "Oʻzbekcha", direction: "ltr", region: "Middle East & West Asia" },

  // --- EAST & SOUTHEAST ASIA ---
  { code: "my", name: "Burmese", nativeName: "မြန်မာစာ", direction: "ltr", region: "East & Southeast Asia" },
  { code: "km", name: "Khmer", nativeName: "ភាសាខ្មែរ", direction: "ltr", region: "East & Southeast Asia" },
  { code: "lo", name: "Lao", nativeName: "ພາສາລາວ", direction: "ltr", region: "East & Southeast Asia" },
  { code: "ms", name: "Malay", nativeName: "Bahasa Melayu", direction: "ltr", region: "East & Southeast Asia" },
  { code: "fil", name: "Filipino (Tagalog)", nativeName: "Filipino", direction: "ltr", region: "East & Southeast Asia" },
  { code: "mn", name: "Mongolian", nativeName: "Монгол хэл", direction: "ltr", region: "East & Southeast Asia" },

  // --- AFRICA ---
  { code: "af", name: "Afrikaans", nativeName: "Afrikaans", direction: "ltr", region: "Africa" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ", direction: "ltr", region: "Africa" },
  { code: "ny", name: "Chichewa", nativeName: "Chichewa", direction: "ltr", region: "Africa" },
  { code: "ha", name: "Hausa", nativeName: "Hausa", direction: "ltr", region: "Africa" },
  { code: "ig", name: "Igbo", nativeName: "Asụsụ Igbo", direction: "ltr", region: "Africa" },
  { code: "rw", name: "Kinyarwanda", nativeName: "Ikinyarwanda", direction: "ltr", region: "Africa" },
  { code: "st", name: "Sesotho", nativeName: "Sesotho", direction: "ltr", region: "Africa" },
  { code: "so", name: "Somali", nativeName: "Soomaaliga", direction: "ltr", region: "Africa" },
  { code: "xh", name: "Xhosa", nativeName: "isiXhosa", direction: "ltr", region: "Africa" },
  { code: "yo", name: "Yoruba", nativeName: "Èdè Yorùbá", direction: "ltr", region: "Africa" },
  { code: "zu", name: "Zulu", nativeName: "isiZulu", direction: "ltr", region: "Africa" },
];

/**
 * Normalizes user locale string (e.g., 'en-US', 'hi-IN', 'es_419') to matching supported language.
 */
export function matchSupportedLanguage(localeOrCode: string): LanguageInfo {
  if (!localeOrCode) return WORLD_LANGUAGES[0];
  const cleaned = localeOrCode.trim().toLowerCase().replace("_", "-");

  // 1. Direct match on code
  const exact = WORLD_LANGUAGES.find(l => l.code.toLowerCase() === cleaned);
  if (exact) return exact;

  // 2. Base language match (e.g. 'hi-IN' -> 'hi', 'en-AU' -> 'en')
  const base = cleaned.split("-")[0];
  const baseMatch = WORLD_LANGUAGES.find(l => l.code.toLowerCase() === base);
  if (baseMatch) return baseMatch;

  // 3. Fallback to English
  return WORLD_LANGUAGES[0];
}

export function getLanguageInfo(code: string): LanguageInfo {
  return matchSupportedLanguage(code);
}
