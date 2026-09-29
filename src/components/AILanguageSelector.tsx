import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Globe, ChevronDown, Search, Check, X, Sparkles, Zap } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageInfo, LanguageRegion, WORLD_LANGUAGES } from "../i18n/languages";
import { useCredits } from "../context/CreditsContext";

// Quick-select primary language codes prominently displayed in the AI selector
const PRIMARY_LANG_CODES = [
  "en",    // English
  "hi",    // हिन्दी (Hindi)
  "bn",    // বাংলা (Bengali)
  "ur",    // اردو (Urdu)
  "ar",    // العربية (Arabic)
  "es",    // Español (Spanish)
  "fr",    // Français (French)
  "pt",    // Português (Portuguese)
  "de",    // Deutsch (German)
  "ja",    // 日本語 (Japanese)
  "ko",    // 한국어 (Korean)
  "zh-CN", // 中文 (Chinese)
];

const CATEGORIES: Array<{ id: string; label: string; region?: LanguageRegion }> = [
  { id: "popular", label: "Recommended" },
  { id: "south_asia", label: "South Asia", region: "South Asia" },
  { id: "mideast", label: "Middle East & West Asia", region: "Middle East & West Asia" },
  { id: "europe", label: "Europe", region: "Europe" },
  { id: "east_asia", label: "East & SE Asia", region: "East & Southeast Asia" },
  { id: "africa", label: "Africa", region: "Africa" },
  { id: "all", label: "All Languages" },
];

function fuzzyScore(text: string, query: string): number {
  if (!text || !query) return 0;
  const tNorm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const qNorm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (tNorm === qNorm) return 100;
  if (tNorm.startsWith(qNorm)) return 90;
  if (tNorm.includes(qNorm)) return 75;

  let qIdx = 0;
  let tIdx = 0;
  let consecutive = 0;
  let score = 0;

  while (qIdx < qNorm.length && tIdx < tNorm.length) {
    if (qNorm[qIdx] === tNorm[tIdx]) {
      qIdx++;
      consecutive++;
      score += 8 + consecutive * 2;
    } else {
      consecutive = 0;
    }
    tIdx++;
  }

  if (qIdx === qNorm.length) {
    return Math.max(score, 45);
  }

  if (qNorm.length >= 3) {
    const words = tNorm.split(/[\s\-()]+/);
    for (const w of words) {
      if (Math.abs(w.length - qNorm.length) <= 1) {
        let diff = 0;
        const minLen = Math.min(w.length, qNorm.length);
        for (let i = 0; i < minLen; i++) {
          if (w[i] !== qNorm[i]) diff++;
        }
        diff += Math.abs(w.length - qNorm.length);
        if (diff <= 1) return 40;
      }
    }
  }

  return 0;
}

export interface AILanguageSelectorProps {
  label?: string;
  compact?: boolean;
  className?: string;
}

export const AILanguageSelector: React.FC<AILanguageSelectorProps> = ({
  label = "Which language should I use for your AI response?",
  compact = false,
  className = "",
}) => {
  const { language, languageInfo, setLanguage, supportedLanguages, isRtl } = useLanguage();
  const { 
    isAnonymous, 
    consultationsUsed, 
    plan, 
    dailyLimit, 
    creditsRemaining,
    openSignupModal, 
    openStatusModal 
  } = useCredits();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Map primary quick pills from supportedLanguages
  const quickLangs = useMemo(() => {
    const list = PRIMARY_LANG_CODES.map((code) =>
      supportedLanguages.find((l) => l.code === code)
    ).filter((l): l is LanguageInfo => Boolean(l));

    // If current selected language is not in primary list, add it as first pill
    const isCurrentInPrimary = PRIMARY_LANG_CODES.some((code) =>
      language.toLowerCase().startsWith(code.toLowerCase())
    );
    if (!isCurrentInPrimary && languageInfo) {
      list.unshift(languageInfo);
    }
    return list;
  }, [supportedLanguages, language, languageInfo]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Fuzzy filter for modal search
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim();
    if (q) {
      const scoredList: Array<{ lang: LanguageInfo; score: number }> = [];
      for (const l of supportedLanguages) {
        const codeScore = fuzzyScore(l.code, q) * 1.2;
        const nativeScore = fuzzyScore(l.nativeName, q);
        const englishScore = fuzzyScore(l.name, q);
        const bestScore = Math.max(codeScore, nativeScore, englishScore);
        if (bestScore > 0) {
          scoredList.push({ lang: l, score: bestScore });
        }
      }
      return scoredList.sort((a, b) => b.score - a.score).map((item) => item.lang);
    }

    if (selectedCategory === "popular") {
      return supportedLanguages.filter((l) => l.popular);
    }
    if (selectedCategory === "all") {
      return supportedLanguages;
    }
    const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
    if (catObj && catObj.region) {
      return supportedLanguages.filter((l) => l.region === catObj.region);
    }
    return supportedLanguages;
  }, [searchQuery, selectedCategory, supportedLanguages]);

  const handleSelect = useCallback(
    (lang: LanguageInfo) => {
      setLanguage(lang.code);
      setIsOpen(false);
      setSearchQuery("");
    },
    [setLanguage]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (filteredLanguages.length > 0) {
          setFocusedIndex((prev) => (prev + 1) % filteredLanguages.length);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (filteredLanguages.length > 0) {
          setFocusedIndex((prev) => (prev - 1 + filteredLanguages.length) % filteredLanguages.length);
        }
        break;
      case "Enter":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredLanguages.length) {
          handleSelect(filteredLanguages[focusedIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  const isCurrentLang = (code: string) => {
    return (
      language.toLowerCase() === code.toLowerCase() ||
      language.toLowerCase().startsWith(code.toLowerCase() + "-")
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Compact & Professional Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-slate-900/95 via-cyan-950/30 to-slate-900/95 border border-cyan-500/30 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="Globe">🌐</span>
          <span className="text-xs font-semibold text-slate-200">
            Response Language:
          </span>
          <span className="hidden sm:inline-block text-[10px] text-slate-400">
            (AI explains, plans & writes in this language)
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
              isOpen
                ? "bg-cyan-500 text-slate-950 border-cyan-400 font-bold"
                : "bg-cyan-950/80 hover:bg-cyan-900/90 border-cyan-500/40 text-cyan-300 hover:text-white"
            }`}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            id="ai-language-selector-btn"
          >
            <span>{languageInfo.nativeName}</span>
            {languageInfo.nativeName !== languageInfo.name && (
              <span className="text-[10px] opacity-75 hidden xs:inline">({languageInfo.name})</span>
            )}
            {isRtl && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/40 uppercase font-mono">
                RTL
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Compact AI Credits Indicator */}
          <button
            type="button"
            onClick={isAnonymous && consultationsUsed >= 1 ? openSignupModal : openStatusModal}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer shadow-sm active:scale-95 ${
              isAnonymous
                ? consultationsUsed === 0
                  ? "bg-purple-950/80 border-purple-500/40 text-purple-300 hover:bg-purple-900/90"
                  : "bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900/90"
                : plan === "pro"
                ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/90"
                : creditsRemaining === 0
                ? "bg-rose-950/80 border-rose-500/40 text-rose-300 hover:bg-rose-900/90"
                : "bg-purple-950/80 hover:bg-purple-900/90 border-purple-500/40 text-purple-300 hover:text-white"
            }`}
            title="Click to view AI Credits quota"
          >
            <Zap className={`w-3.5 h-3.5 shrink-0 ${
              isAnonymous && consultationsUsed >= 1 ? "text-rose-400" : "text-cyan-400"
            }`} />
            <span className="font-mono">
              {isAnonymous
                ? (consultationsUsed === 0 ? "1 Free AI Test" : "Sign Up (Free)")
                : dailyLimit === Infinity
                ? "PRO • Unlimited"
                : `AI Credits: ${creditsRemaining}/${dailyLimit} today`
              }
            </span>
          </button>
        </div>
      </div>

      {/* Accessible Searchable Popover Dropdown Modal */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Worldwide AI Response Language Selector"
          className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#0a0f1d] border border-cyan-500/40 p-3.5 shadow-2xl shadow-cyan-950/80 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                Select AI Response Language (70+ Supported)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by language name or native script (e.g., Hindi, हिन्दी, বাংলা, Arabic, Español...)"
              className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-950 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-500/30 text-xs text-white placeholder-slate-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Pills (visible when no search query) */}
          {!searchQuery && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none text-[10px]">
              {CATEGORIES.map((cat) => {
                const isCatActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer ${
                      isCatActive
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400 font-bold"
                        : "bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Language Grid / List */}
          <div
            ref={listboxRef}
            role="listbox"
            className="max-h-[260px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800 focus:outline-none"
          >
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No language found matching "{searchQuery}"
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                {filteredLanguages.map((lang, index) => {
                  const active = isCurrentLang(lang.code);
                  const isFocused = index === focusedIndex;

                  return (
                    <button
                      key={lang.code}
                      ref={isFocused ? (el) => { activeItemRef.current = el; } : undefined}
                      type="button"
                      onClick={() => handleSelect(lang)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                        active
                          ? "bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-semibold"
                          : isFocused
                          ? "bg-slate-800 text-white"
                          : "hover:bg-slate-900 text-slate-300 hover:text-white border border-transparent"
                      }`}
                    >
                      <div className="flex items-baseline gap-1.5 min-w-0 pr-1">
                        <span className={`text-xs ${active ? "text-cyan-300 font-bold" : "text-white"}`}>
                          {lang.nativeName}
                        </span>
                        {lang.nativeName !== lang.name && (
                          <span className="text-[10px] text-slate-400 truncate">
                            — {lang.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {lang.direction === "rtl" && (
                          <span className="text-[8px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800/40">
                            RTL
                          </span>
                        )}
                        <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-slate-950 text-slate-500">
                          {lang.code}
                        </span>
                        {active && <Check className="w-3.5 h-3.5 text-cyan-400 ml-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Active Summary */}
          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Current AI Language: <strong className="text-cyan-300 font-semibold">{languageInfo.nativeName} ({languageInfo.name})</strong>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
