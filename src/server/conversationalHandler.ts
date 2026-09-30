import { generateAICompletion } from "./aiProvider";
import { UserIntent, LanguageDetectionResult } from "./intentAndLanguageDetector";

export interface ConversationalResponse {
  mode: "conversational" | "business_problem";
  intent: UserIntent;
  language: string;
  replyText: string;
  suggestedQuickReplies?: string[];
}

/**
 * Handles casual conversation and general definition questions naturally and concisely.
 * Strictly avoids generating business diagnoses, tables, or 7-day action plans for small talk.
 */
export async function handleConversationalResponse(options: {
  query: string;
  intent: UserIntent;
  languageDetection: LanguageDetectionResult;
  targetLanguage: string;
  conversationHistory?: Array<{ role?: string; content?: string }>;
}): Promise<ConversationalResponse> {
  const { query, intent, languageDetection, targetLanguage, conversationHistory = [] } = options;
  const clean = query.trim().toLowerCase();

  // Instant fast-path responses for common short conversational questions

  // 1. "Aap kaise ho?" / "Kaise ho"
  if (/^(?:aap\s+kaise\s+ho|kaise\s+ho|kese\s+ho|aap\s+kese\s+ho)[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "Hinglish",
      replyText: "Main theek hoon 😊 Aap kaise ho?",
      suggestedQuickReplies: ["Main bhi theek hoon", "Mera business grow nahi kar raha", "Ek sawal hai"],
    };
  }

  // 2. "How are you?"
  if (/^how\s+are\s+you[\s?.]*$/i.test(clean) || /^how\s+r\s+u[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "English",
      replyText: "I'm doing well! 😊 How are you?",
      suggestedQuickReplies: ["I'm good!", "I need help with my business", "What can you do?"],
    };
  }

  // 3. "क्या कर रहे हो?" (Devanagari)
  if (/^(?:क्या कर रहे हो|क्या हो रहा है)[\s?.]*$/.test(query.trim())) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "Hindi",
      replyText: "मैं आपकी मदद करने के लिए यहाँ हूँ 😊 आप क्या जानना चाहते हैं?",
      suggestedQuickReplies: ["व्यापार कैसे बढ़ाएं?", "वेबसाइट कैसे चेक करें?", "नमस्ते"],
    };
  }

  // 4. "তুমি কেমন আছো?" / "আপনি কেমন আছেন?" (Bengali)
  if (/^(?:তুমি কেমন আছো|আপনি কেমন আছেন|কেমন আছেন|কেমন আছো)[\s?.]*$/.test(query.trim())) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "Bengali",
      replyText: "আমি ভালো আছি 😊 তুমি কেমন আছো?",
      suggestedQuickReplies: ["আমিও ভালো আছি", "আমার ব্যবসা বাড়াতে চাই", "তুমি কি করতে পারো?"],
    };
  }

  // 5. "आप क्या कर सकते हो?" / "tum kya kar sakte ho" / "what can you do"
  if (/^(?:आप क्या कर सकते हो|आप क्या कर सकते हैं|तुम क्या कर सकते हो)[\s?.]*$/.test(query.trim()) ||
      /^(?:aap\s+kya\s+kar\s+sakte\s+ho|tum\s+kya\s+kar\s+sakte\s+ho)[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: languageDetection.script === "Devanagari" ? "Hindi" : "Hinglish",
      replyText: languageDetection.script === "Devanagari"
        ? "मैं आपके व्यापार की वृद्धि, वेबसाइट ट्रैफिक, एसईओ, सोशल मीडिया और ग्राहकों को लाने में आपकी पूरी मदद कर सकता हूँ 😊 आप किस चीज़ पर काम करना चाहते हैं?"
        : "Main aapke business growth, website traffic, SEO, social media aur customers laane mein madad kar sakta hoon 😊 Aapko kis cheez par kaam karna hai?",
      suggestedQuickReplies: ["Website ka traffic badhana hai", "Sales kaise badhegi?", "Ad plan banana hai"],
    };
  }

  // 6. "What can you do?"
  if (/^what\s+can\s+you\s+do[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "English",
      replyText: "I can help diagnose your website, analyze search and traffic bottlenecks, build marketing & customer acquisition plans, and solve business problems! 😊 What would you like to explore?",
      suggestedQuickReplies: ["Check my website", "How to increase sales?", "Create an ad plan"],
    };
  }

  // 7. "Main bhi theek hoon"
  if (/^(?:main\s+bhi\s+theek\s+hoon|mai\s+bhi\s+theek|sab\s+theek|all\s+good)[\s!.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: targetLanguage,
      replyText: "Ye sunkar accha laga 😊 Bataiye, aaj main aapki kya madad kar sakta hoon?",
      suggestedQuickReplies: ["Mera business grow nahi kar raha", "Website check karni hai"],
    };
  }

  // 8. "What's your name?" / "Who are you?"
  if (/^(?:what(?:'s|\s+is)\s+your\s+name|who\s+are\s+you|tum\s+kaun\s+ho|aapka\s+naam\s+kya\s+hai)[\s?.]*$/i.test(clean)) {
    const isHindi = languageDetection.isMixedOrHinglish || languageDetection.languageCode === "hi";
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: targetLanguage,
      replyText: isHindi 
        ? "Main aapka AI business assistant hoon 😊 Aapke business, marketing aur analytics mein madad ke liye yahan hoon."
        : "I'm your AI business assistant. 😊",
    };
  }

  // 9. "Thanks" / "Thank you" / "धन्यवाद" / "ধন্যবাদ"
  if (/^(?:thanks|thank\s+you|thx|ty|shukriya|dhanyawad|dhonnobad|ধন্যবাদ|धन्यवाद)[\s!.]*$/i.test(clean)) {
    const isHindi = languageDetection.isMixedOrHinglish || languageDetection.languageCode === "hi";
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: targetLanguage,
      replyText: isHindi ? "Aapka swagat hai! 😊 Kabhi bhi kuch poochna ho to batana." : "You're welcome! 😊",
    };
  }

  // 10. "Okay" / "Ok"
  if (/^(?:ok|okay|k|thik\s+hai|theek\s+hai|thik\s+ache|theek\s+h)[\s!.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: targetLanguage,
      replyText: "👍",
    };
  }

  // 11. "Good morning" / "Good evening"
  if (/^good\s*(?:morning|afternoon|evening)[\s!.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: "English",
      replyText: "Good morning! 😊 How can I help you today?",
    };
  }

  // 12. "Are you tired?"
  if (/^(?:are\s+you\s+tired|thak\s+gaye\s+kya)[\s?.]*$/i.test(clean)) {
    const isHindi = languageDetection.isMixedOrHinglish || languageDetection.languageCode === "hi";
    return {
      mode: "conversational",
      intent: "CASUAL_CONVERSATION",
      language: targetLanguage,
      replyText: isHindi ? "Bilkul nahi 😊 Main hamesha ready hoon aapki madad ke liye." : "No 😊 I'm here and ready to help.",
    };
  }

  // 13. "Google Analytics kya hota hai?"
  if (/^google\s+analytics\s+(?:kya\s+hota\s+hai|kya\s+hai)[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "GENERAL_QUESTION",
      language: "Hinglish",
      replyText: "Google Analytics ek free tool hai jisse aap dekh sakte ho ki kitne log aapki website par aaye, kahan se aaye (Google, Social, Direct), aur unhone website par kya kiya 😊 Agar aapko apni site ke liye check karna hai to batayein!",
      suggestedQuickReplies: ["Website ka traffic kaise check kare?", "GA4 kaise setup kare?"],
    };
  }

  // 14. "website ka traffic kaise check kare?"
  if (/^website\s+ka\s+traffic\s+kaise\s+check\s+kare[\s?.]*$/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "GENERAL_QUESTION",
      language: "Hinglish",
      replyText: "Website ka traffic check karne ke liye Google Analytics use kar sakte ho. Agar chaho to main step-by-step bata deta hoon 😊",
      suggestedQuickReplies: ["Haan step-by-step batao", "Mera website check karo"],
    };
  }

  // 15. "Explain CTR in English" / "What is CTR in English"
  if (/\b(?:explain\s+ctr\s+in\s+english|what\s+is\s+ctr\s+in\s+english|ctr\s+in\s+english)\b/i.test(clean)) {
    return {
      mode: "conversational",
      intent: "GENERAL_QUESTION",
      language: "English",
      replyText: "CTR stands for Click-Through Rate. It is the percentage of people who click on your link after seeing it in Google search results or an ad.\n\nFormula: (Total Clicks ÷ Total Impressions) × 100 = CTR%\n\nFor example, if 1,000 people see your search result and 50 people click, your CTR is 5% 😊",
    };
  }

  // For other conversational or general questions, prompt AI to answer naturally and concisely
  const historyText = conversationHistory.slice(-4).map(
    (m) => `${m.role || "user"}: ${m.content || ""}`
  ).join("\n");

  const systemPrompt = `You are a friendly, intelligent AI business assistant.
CRITICAL CONVERSATIONAL RULES:
1. The user is asking a conversational question or a general question.
2. ANSWER NATURALLY AND CONCISELY (1-3 friendly sentences).
3. MATCH THE USER'S EXACT LANGUAGE STYLE:
   - If user asks in Hinglish (e.g. "mera website ka SEO kaise improve karu?"), reply naturally in Hinglish without forcing formal English.
   - If user asks in Hindi, reply in Hindi.
   - If user asks in Bengali, reply in Bengali.
   - If user asks in English, reply in English.
4. SHORT QUESTIONS MUST GET SHORT ANSWERS. Do not ramble.
5. DO NOT generate structured reports, 7-day calendars, tables, or diagnostic templates for casual queries.
6. DO NOT claim personal human biological experiences (e.g. do not say "I slept well" or "I ate food").
7. Be warm, polite, and helpful (emojis like 😊 are welcome).

Target Output Language: ${targetLanguage}`;

  const prompt = `${historyText ? `Recent Conversation:\n${historyText}\n\n` : ""}User message: "${query}"

Reply naturally and concisely in ${targetLanguage}:`;

  try {
    const aiResult = await generateAICompletion(prompt, {
      systemPrompt,
      timeoutMs: 6500,
    });
    return {
      mode: "conversational",
      intent,
      language: targetLanguage,
      replyText: aiResult.text.trim(),
    };
  } catch (err) {
    // Graceful fallback
    return {
      mode: "conversational",
      intent,
      language: targetLanguage,
      replyText: "Main aapki madad ke liye yahan hoon 😊 Aap kya janna chahte hain?",
    };
  }
}
