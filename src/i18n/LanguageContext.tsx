import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "firebase/auth";
import { WORLD_LANGUAGES, LanguageInfo, matchSupportedLanguage, getLanguageInfo } from "./languages";
import { getTranslation } from "./translations";
import { getUserLanguagePreference, updateUserLanguagePreference } from "../services/storageService";

const STORAGE_KEY = "bge_preferred_language";

interface LanguageContextType {
  language: string;
  languageInfo: LanguageInfo;
  isRtl: boolean;
  setLanguage: (code: string) => Promise<void>;
  t: (keyPath: string, fallback?: string, variables?: Record<string, string | number>) => string;
  supportedLanguages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  user?: User | null;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, user }) => {
  // Detect initial language:
  // 1. Check localStorage
  // 2. Fallback to browser language
  // 3. Fallback to English
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return matchSupportedLanguage(saved).code;
      }
      const navLang = navigator.language || (navigator as any).userLanguage;
      if (navLang) {
        const detected = matchSupportedLanguage(navLang);
        return detected.code;
      }
    }
    return "en";
  });

  const languageInfo = getLanguageInfo(language);
  const isRtl = languageInfo.direction === "rtl";

  // When user logs in, check their stored Firestore preference
  useEffect(() => {
    if (!user || !user.uid) return;

    let isMounted = true;
    getUserLanguagePreference(user.uid).then((remoteLang) => {
      if (isMounted && remoteLang && remoteLang !== language) {
        const matched = matchSupportedLanguage(remoteLang);
        setLanguageState(matched.code);
        localStorage.setItem(STORAGE_KEY, matched.code);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Synchronize document.documentElement attributes whenever language changes
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = languageInfo.code;
      document.documentElement.dir = languageInfo.direction;

      if (languageInfo.direction === "rtl") {
        document.documentElement.classList.add("rtl");
        document.body.classList.add("rtl-layout");
        document.body.dir = "rtl";
      } else {
        document.documentElement.classList.remove("rtl");
        document.body.classList.remove("rtl-layout");
        document.body.dir = "ltr";
      }
    }
  }, [languageInfo]);

  const setLanguage = useCallback(async (code: string) => {
    const matched = matchSupportedLanguage(code);
    setLanguageState(matched.code);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, matched.code);
    }

    if (user && user.uid) {
      try {
        await updateUserLanguagePreference(user.uid, matched.code);
      } catch (err) {
        console.warn("Could not save language preference to Firestore:", err);
      }
    }
  }, [user]);

  const t = useCallback(
    (keyPath: string, fallback?: string, variables?: Record<string, string | number>) => {
      return getTranslation(language, keyPath, fallback, variables);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        languageInfo,
        isRtl,
        setLanguage,
        t,
        supportedLanguages: WORLD_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
