import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Globe, ChevronDown, Search, Check, X } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import { LanguageInfo, LanguageRegion } from "../i18n/languages";

const CATEGORIES: Array<{ id: string; label: string; region?: LanguageRegion }> = [
  { id: "popular", label: "Recommended" },
  { id: "south_asia", label: "South Asia", region: "South Asia" },
  { id: "mideast", label: "Middle East & West Asia", region: "Middle East & West Asia" },
  { id: "europe", label: "Europe", region: "Europe" },
  { id: "east_asia", label: "East & SE Asia", region: "East & Southeast Asia" },
  { id: "africa", label: "Africa", region: "Africa" },
  { id: "all", label: "All Languages" },
];

/**
 * High-performance real-time fuzzy matching function.
 * Evaluates exact match, prefixes, substrings, subsequence order, and typo tolerance.
 */
function fuzzyScore(text: string, query: string): number {
  if (!text || !query) return 0;

  const tNorm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const qNorm = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  if (tNorm === qNorm) return 100;
  if (tNorm.startsWith(qNorm)) return 90;
  if (tNorm.includes(qNorm)) return 75;

  // Subsequence match (e.g. "bngl" matching "bengali", "esp" in "espanol", "arbc" in "arabic")
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

  // Typo tolerance for queries >= 3 characters (1 edit distance allowance)
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

export const LanguageSelector: React.FC = () => {
  const { language, languageInfo, setLanguage, supportedLanguages, t, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement | null>(null);

  // Focus management: open/close focus transitions
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(-1);
      // Ensure focus shifts to search input immediately upon opening
      const timer = setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 30);
      return () => clearTimeout(timer);
    } else {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Click outside to close (supporting mouse and touch)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
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

  // Real-time fuzzy filtering across English name, native name, and language code
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim();

    if (q) {
      const scoredList: Array<{ lang: LanguageInfo; score: number }> = [];

      for (const l of supportedLanguages) {
        // Test Code match (highest priority)
        const codeScore = fuzzyScore(l.code, q) * 1.2;
        // Test Native Name match (e.g. हिन्दी, বাংলা, اردو, Español, Français)
        const nativeScore = fuzzyScore(l.nativeName, q);
        // Test English Name match
        const englishScore = fuzzyScore(l.name, q);

        const bestScore = Math.max(codeScore, nativeScore, englishScore);
        if (bestScore > 0) {
          scoredList.push({ lang: l, score: bestScore });
        }
      }

      // Sort by match relevance score descending
      return scoredList
        .sort((a, b) => b.score - a.score)
        .map((item) => item.lang);
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

  // Reset or adjust focusedIndex when filtered items change
  useEffect(() => {
    if (filteredLanguages.length > 0) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  }, [filteredLanguages]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (focusedIndex >= 0 && activeItemRef.current) {
      activeItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [focusedIndex]);

  const handleSelectLanguage = useCallback((lang: LanguageInfo) => {
    setLanguage(lang.code);
    setIsOpen(false);
    setSearchQuery("");
    // Return focus to trigger button for seamless accessibility
    setTimeout(() => {
      triggerRef.current?.focus();
    }, 20);
  }, [setLanguage]);

  // Keyboard navigation handler for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

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
          handleSelectLanguage(filteredLanguages[focusedIndex]);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
        break;

      case "Home":
        if (filteredLanguages.length > 0) {
          e.preventDefault();
          setFocusedIndex(0);
        }
        break;

      case "End":
        if (filteredLanguages.length > 0) {
          e.preventDefault();
          setFocusedIndex(filteredLanguages.length - 1);
        }
        break;

      default:
        break;
    }
  };

  // Compact code display: e.g. "EN", "HI", "BN", "AR", "ES", "PT"
  const shortCode = language.toUpperCase().split("-")[0];

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Compact Header Trigger Button */}
      <button
        ref={triggerRef}
        id="header-language-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="language-dropdown-dialog"
        aria-label={`Select language. Currently active: ${languageInfo.nativeName} (${languageInfo.name})`}
        title={`${languageInfo.nativeName} (${languageInfo.name}) - ${t("header.changeLanguage", "Change Language")}`}
        className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
          isOpen
            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-500/30"
            : "bg-slate-900/80 text-slate-200 hover:text-white border-slate-800 hover:border-slate-700 hover:bg-slate-800/90"
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
        <span className="font-bold tracking-wide text-[11px] sm:text-xs">
          {shortCode}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cyan-400" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Accessible Searchable Popover Dropdown */}
      {isOpen && (
        <div
          id="language-dropdown-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Worldwide Language Selector"
          className={`absolute z-50 mt-2 w-[310px] sm:w-[360px] max-w-[92vw] rounded-2xl bg-[#0c1222]/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl shadow-cyan-950/50 p-3 transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? "left-0 sm:left-0" : "right-0 sm:right-0"
          }`}
          style={{ top: "100%" }}
          onKeyDown={handleKeyDown}
        >
          {/* Header & Title */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" aria-hidden="true" />
              <span className="text-xs font-bold text-white tracking-wide">
                {t("header.changeLanguage", "Worldwide Languages")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                triggerRef.current?.focus();
              }}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              aria-label={t("common.close", "Close language selector")}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Real-time Fuzzy Search Box with Accessible Combobox */}
          <div className="relative mb-2.5">
            <label htmlFor="language-search-input" className="sr-only">
              {t("header.searchLanguage", "Search language by English name, native name, or code")}
            </label>
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="language-search-input"
              ref={searchInputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isOpen}
              aria-controls="language-listbox"
              aria-activedescendant={
                focusedIndex >= 0 && filteredLanguages[focusedIndex]
                  ? `lang-item-${filteredLanguages[focusedIndex].code}`
                  : undefined
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("header.searchLanguage", "Search Hindi, हिन्दी, Spanish, Español, ar, etc...")}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 text-xs text-white placeholder-slate-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 cursor-pointer"
                title="Clear search"
                aria-label="Clear search query"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Screen Reader Live Status */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {filteredLanguages.length} languages found. Use arrow keys to navigate and Enter to select.
          </div>

          {/* Category Filter Pills (hidden when active search query is entered) */}
          {!searchQuery && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none text-[10px]" role="tablist" aria-label="Language Regions">
              {CATEGORIES.map((cat) => {
                const isCatActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="tab"
                    aria-selected={isCatActive}
                    onClick={() => {
                      setSelectedCategory(cat.id);
                      searchInputRef.current?.focus();
                    }}
                    className={`px-2 py-1 rounded-lg shrink-0 font-medium transition-all cursor-pointer ${
                      isCatActive
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 font-semibold"
                        : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Language Listbox */}
          <div
            id="language-listbox"
            ref={listboxRef}
            role="listbox"
            aria-label="Available languages"
            className="max-h-[260px] sm:max-h-[300px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent focus:outline-none"
          >
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No language found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang, index) => {
                const isSelected =
                  language.toLowerCase() === lang.code.toLowerCase() ||
                  language.toLowerCase().startsWith(lang.code.toLowerCase() + "-");
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={lang.code}
                    id={`lang-item-${lang.code}`}
                    ref={isFocused ? (el) => { activeItemRef.current = el; } : undefined}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelectLanguage(lang)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors group cursor-pointer ${
                      isFocused
                        ? "bg-slate-800/90 text-white ring-1 ring-cyan-500/50"
                        : isSelected
                        ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300"
                        : "hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0 pr-2">
                      {/* Native language name in proper Unicode */}
                      <span className={`font-semibold text-xs truncate ${
                        isFocused || isSelected ? "text-cyan-300" : "text-white"
                      }`}>
                        {lang.nativeName}
                      </span>
                      {/* English name */}
                      {lang.nativeName !== lang.name && (
                        <span className="text-[11px] text-slate-400 truncate">
                          — {lang.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {lang.direction === "rtl" && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40 font-mono">
                          RTL
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {lang.code}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" aria-hidden="true" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer with active language summary */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              Active: <strong className="text-white font-medium">{languageInfo.nativeName}</strong>
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {supportedLanguages.length} Languages
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Also export as LanguageDropdown for complete compatibility
export const LanguageDropdown = LanguageSelector;
