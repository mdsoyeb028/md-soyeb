/**
 * Intent & Language Detector for Natural Conversation and Business Problem Solving
 * 
 * Strict Guidelines:
 * 1. Casual conversational questions MUST get brief, natural answers.
 * 2. Do NOT treat every message as a business problem.
 * 3. Automatic language matching: USER LANGUAGE -> AI RESPONSE LANGUAGE (Hindi -> Hindi, Hinglish -> Hinglish, Bengali -> Bengali, English -> English).
 * 4. Short questions get short answers.
 * 5. Do not hallucinate personal human experiences.
 * 6. Intent classification:
 *    CASUAL_CONVERSATION | GENERAL_QUESTION | BUSINESS_PROBLEM | SEO | SOCIAL_MEDIA |
 *    SALES | MARKETING | TRAFFIC_ANALYSIS | WEBSITE_ANALYSIS | EXPORT | ADS |
 *    IMAGE_ANALYSIS | TECHNICAL_HELP | OTHER
 */

export type UserIntent = 
  | "CASUAL_CONVERSATION"
  | "GENERAL_QUESTION"
  | "BUSINESS_PROBLEM"
  | "SEO"
  | "SOCIAL_MEDIA"
  | "SALES"
  | "MARKETING"
  | "TRAFFIC_ANALYSIS"
  | "WEBSITE_ANALYSIS"
  | "EXPORT"
  | "ADS"
  | "IMAGE_ANALYSIS"
  | "TECHNICAL_HELP"
  | "OTHER";

export interface LanguageDetectionResult {
  detectedLanguage: string;
  languageCode: string;
  isMixedOrHinglish: boolean;
  script: "Devanagari" | "Bengali" | "Arabic_Urdu" | "Latin" | "Japanese" | "Other";
  explicitRequestedLanguage?: string;
}

/**
 * Detects the language and style of the user's message
 */
export function detectLanguage(text: string, manualSelection?: string): LanguageDetectionResult {
  const query = text.trim();
  const lower = query.toLowerCase();

  // 1. Check for explicit user request (e.g. "explain in English", "Hindi mein batao", "in Spanish")
  let explicitRequestedLanguage: string | undefined;
  if (/\b(?:in english|english mein|in plain english|explain in english)\b/i.test(query)) {
    explicitRequestedLanguage = "English";
  } else if (/\b(?:in hindi|hindi mein|hindi me)\b/i.test(query)) {
    explicitRequestedLanguage = "Hindi";
  } else if (/\b(?:in bengali|bangla te|in bangla)\b/i.test(query)) {
    explicitRequestedLanguage = "Bengali";
  } else if (/\b(?:in urdu|urdu mein)\b/i.test(query)) {
    explicitRequestedLanguage = "Urdu";
  } else if (/\b(?:in spanish|en español)\b/i.test(query)) {
    explicitRequestedLanguage = "Spanish";
  }

  // 2. Check native scripts
  if (/[\u0980-\u09FF]/.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Bengali",
      languageCode: "bn",
      isMixedOrHinglish: false,
      script: "Bengali",
      explicitRequestedLanguage,
    };
  }

  if (/[\u0900-\u097F]/.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Hindi",
      languageCode: "hi",
      isMixedOrHinglish: false,
      script: "Devanagari",
      explicitRequestedLanguage,
    };
  }

  if (/[\u0600-\u06FF]/.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Urdu",
      languageCode: "ur",
      isMixedOrHinglish: false,
      script: "Arabic_Urdu",
      explicitRequestedLanguage,
    };
  }

  if (/[\u3040-\u30FF\u4E00-\u9FAF]/.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Japanese",
      languageCode: "ja",
      isMixedOrHinglish: false,
      script: "Japanese",
      explicitRequestedLanguage,
    };
  }

  // 3. Latin script analysis: detect Hinglish / Romanized Hindi / Romanized Bengali / Spanish / English
  const hinglishMarkers = [
    /\b(?:aap|kaise|kaisa|kaisi|ho|hain|hai|theek|thik|kya|kar|rahe|rahi|mera|meri|mere|mujhe|hum|hume|batao|bataiye|chahiye|karna|karne|sunkar|accha|achha|bahut|bahot|bohot|shukriya|dhanyawad|namaste|kyu|kyun|kab|kahan|kidhar|nahi|nahin|na|sab|thoda|log|logon|badhegi|badhana|aayega|aaye|milega|milenge|milta|kaam|bhai|yaar|dost|bata|bol|dekho|dekh)\b/i,
    /\b(?:waise|lekin|magar|par|aur|bhi|toh|to|pe|par|se|mein|me|ko|ke|liye|baat|tarah|sakte|sakta|saktee)\b/i,
  ];

  let hinglishMatches = 0;
  for (const regex of hinglishMarkers) {
    const matches = query.match(new RegExp(regex.source, "gi"));
    if (matches) hinglishMatches += matches.length;
  }

  // Bengali Romanized markers
  if (/\b(?:kemon|acho|achhen|bhalo|aami|ami|tumi|apuni|ki|korcho|korchen|dhonnobad|shomoshya|bujhechi)\b/i.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Bengali (Romanized)",
      languageCode: "bn-latn",
      isMixedOrHinglish: true,
      script: "Latin",
      explicitRequestedLanguage,
    };
  }

  // Spanish markers
  if (/\b(?:hola|cómo estás|como estas|buenos días|buenas tardes|gracias|negocio|cliente|ventas|página|tráfico)\b/i.test(query)) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Spanish",
      languageCode: "es",
      isMixedOrHinglish: false,
      script: "Latin",
      explicitRequestedLanguage,
    };
  }

  // Hinglish / Mixed Hindi-English
  if (hinglishMatches >= 1) {
    return {
      detectedLanguage: explicitRequestedLanguage || "Hinglish (Hindi in Roman script)",
      languageCode: "hi-latn",
      isMixedOrHinglish: true,
      script: "Latin",
      explicitRequestedLanguage,
    };
  }

  // Default to English
  return {
    detectedLanguage: explicitRequestedLanguage || "English",
    languageCode: "en",
    isMixedOrHinglish: false,
    script: "Latin",
    explicitRequestedLanguage,
  };
}

/**
 * Determines the target response language taking into account manual selection
 */
export function resolveTargetLanguage(
  detected: LanguageDetectionResult,
  manualSelection?: string
): string {
  // If user explicitly asked in prompt (e.g. "in English")
  if (detected.explicitRequestedLanguage) {
    return detected.explicitRequestedLanguage;
  }

  // If manual selection exists and is NOT "auto" or "Auto / Same as user"
  if (
    manualSelection &&
    manualSelection.toLowerCase() !== "auto" &&
    !manualSelection.toLowerCase().includes("same as user")
  ) {
    return manualSelection;
  }

  // Otherwise, use detected language
  return detected.detectedLanguage;
}

/**
 * Classifies the user's intent into appropriate mode
 */
export function detectIntent(
  query: string,
  history?: Array<{ role?: string; content?: string }>
): UserIntent {
  const clean = query.trim().toLowerCase();

  // 1. Check for pure small talk & greetings (CASUAL_CONVERSATION)
  const casualGreetingPatterns = [
    /^(?:hi|hello|hey|heyy|heya|hola|namaste|namaskar|salam|assalamu alaikum|pranam|good\s*(?:morning|afternoon|evening|night)|howdy)[\s!.]*$/i,
    /^(?:aap\s+kaise\s+ho|kaise\s+ho|kaisa\s+hai|kese\s+ho|aap\s+kese\s+ho|how\s+are\s+you|how\s+r\s+u|how\s+you\s+doing|kemon\s+acho|kemon\s+achhen)[\s?.]*$/i,
    /^(?:kya\s+kar\s+rahe\s+ho|kya\s+ho\s+raha\s+hai|what\s+are\s+you\s+doing|ki\s+korcho|what\s+up|whats\s+up|sup)[\s?.]*$/i,
    /^(?:main\s+theek\s+hoon|mai\s+bhi\s+theek|i\s+am\s+good|i'm\s+good|i\s+am\s+fine|i'm\s+fine|all\s+good|sab\s+theek|bhalo\s+achi)[\s!.]*$/i,
    /^(?:thanks|thank\s+you|thx|ty|shukriya|dhanyawad|dhonnobad|much\s+appreciated)[\s!.]*$/i,
    /^(?:ok|okay|k|thik\s+hai|theek\s+hai|thik\s+ache|sahi\s+hai|sure|cool|nice|done|got\s+it)[\s!.]*$/i,
    /^(?:bye|goodbye|see\s+you|alvida|fir\s+milenge|tata)[\s!.]*$/i,
    /^(?:who\s+are\s+you|what\s+is\s+your\s+name|what's\s+your\s+name|tum\s+kaun\s+ho|aapka\s+naam\s+kya\s+hai|what\s+can\s+you\s+do|aap\s+kya\s+kar\s+sakte\s+ho|tum\s+kya\s+kar\s+sakte\s+ho)[\s?.]*$/i,
    /^(?:are\s+you\s+tired|thak\s+gaye\s+kya|are\s+you\s+human|kya\s+tum\s+human\s+ho|are\s+you\s+a\s+robot)[\s?.]*$/i,
    /^[\u0900-\u097F\s?!.,]+$/i, // Check if short devanagari smalltalk
  ];

  // Specific check for short hindi devanagari greetings
  if (/^(?:नमस्ते|नमस्कार|कैसे हो|आप कैसे हो|क्या कर रहे हो|मैं ठीक हूँ|धन्यवाद|शुक्रिया|अलविदा)[\s?.]*$/.test(query.trim())) {
    return "CASUAL_CONVERSATION";
  }

  // Specific check for short bengali greetings
  if (/^(?:নমস্কার|কেমন আছো|কেমন আছেন|তুমি কেমন আছো|আপনি কেমন আছেন|আমি ভালো আছি|ধন্যবাদ|কি করছো|কি করছেন)[\s?.]*$/.test(query.trim())) {
    return "CASUAL_CONVERSATION";
  }

  for (const pattern of casualGreetingPatterns) {
    if (pattern.test(clean)) {
      return "CASUAL_CONVERSATION";
    }
  }

  // If message is very short (< 4 words) and contains pure casual words
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 3) {
    if (/^(?:hi|hello|hey|thanks|thank\s+you|ok|okay|cool|nice|good|fine|theek|thik|bhalo|kemon|bye)$/i.test(clean)) {
      return "CASUAL_CONVERSATION";
    }
  }

  // 2. Check for GENERAL_QUESTION (simple how-to / definitions / explanatory questions)
  if (
    /^(?:what\s+is|define|explain|kya\s+hota\s+hai|kya\s+hai|kise\s+kehte\s+hain|meaning\s+of|how\s+to\s+check|kaise\s+check\s+kare|kaise\s+dekhe|kaise\s+pata\s+kare)\b/i.test(clean) ||
    /\b(?:website\s+ka\s+traffic\s+kaise\s+check\s+kare|traffic\s+kaise\s+check\s+kare|traffic\s+kaise\s+dekhe|how\s+to\s+check\s+website\s+traffic)\b/i.test(clean) ||
    /^(?:google\s+analytics|ctr|seo|api|b2b|b2c|cpc|cpm|conversion\s+rate)\s+(?:kya\s+hota\s+hai|kya\s+hai|ki\?)[\s?.]*$/i.test(clean)
  ) {
    // If user states an active drop or failure (e.g. "traffic bahut low hai", "sales down"), let it go to business problem solver
    if (!/bahut\s+low|drop|down|zero|kharab|nahi\s+aa\s+raha|stuck/i.test(clean)) {
      return "GENERAL_QUESTION";
    }
  }

  // 3. Check for specific domains
  if (/\b(?:google\s+ads|meta\s+ads|facebook\s+ads|instagram\s+ads|run\s+ads|ad\s+campaign|ad\s+copy)\b/i.test(clean)) {
    return "ADS";
  }

  if (/\b(?:traffic\s+drop|low\s+traffic|website\s+traffic|impressions|search\s+console|analytics\s+data|visitors\s+down)\b/i.test(clean) || clean.includes("traffic bahut low")) {
    return "TRAFFIC_ANALYSIS";
  }

  if (/\b(?:seo|keywords|google\s+ranking|meta\s+tags|page\s+1|sitemap|indexing)\b/i.test(clean)) {
    return "SEO";
  }

  if (/\b(?:instagram|youtube|reel|caption|post\s+ideas|channel\s+growth|views)\b/i.test(clean)) {
    return "SOCIAL_MEDIA";
  }

  if (/\b(?:sales|increase\s+sales|close\s+deals|sales\s+script|objection|customers\s+nahi\s+aa\s+rahe|sales\s+low)\b/i.test(clean)) {
    return "SALES";
  }

  if (/\b(?:export|importer|customs|hs\s+code|international\s+buyers|foreign\s+trade|shipping|incoterms)\b/i.test(clean)) {
    return "EXPORT";
  }

  if (/\b(?:website|landing\s+page|hero\s+section|cta\s+button|ux\s+problem)\b/i.test(clean) || /https?:\/\//i.test(clean)) {
    return "WEBSITE_ANALYSIS";
  }

  if (/\b(?:customers|leads|prospects|client|clients|grow\s+business|business\s+grow|marketing\s+plan)\b/i.test(clean)) {
    return "BUSINESS_PROBLEM";
  }

  // Default fallback for substantive business questions
  return "BUSINESS_PROBLEM";
}
