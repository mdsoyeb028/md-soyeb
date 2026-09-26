import React, { useState, useRef, useEffect, useMemo } from "react";
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

export const LanguageSelector: React.FC = () => {
  const { language, languageInfo, setLanguage, supportedLanguages, t, isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("popular");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
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
      // Auto focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Filtered languages based on search query or category
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      return supportedLanguages.filter((l) => {
        return (
          l.code.toLowerCase().includes(q) ||
          l.name.toLowerCase().includes(q) ||
          l.nativeName.toLowerCase().includes(q)
        );
      });
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

  const handleSelectLanguage = (lang: LanguageInfo) => {
    setLanguage(lang.code);
    setIsOpen(false);
    setSearchQuery("");
  };

  // Compact code display: e.g. "EN", "HI", "BN", "AR", "ES", "PT-BR"
  const shortCode = language.toUpperCase().split("-")[0];

  return (
    <div className="relative inline-block text-left" ref={popoverRef}>
      {/* Compact Trigger Button */}
      <button
        ref={triggerRef}
        id="header-language-btn"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={`Select Language. Current: ${languageInfo.name}`}
        title={`${languageInfo.nativeName} (${languageInfo.name}) - ${t("header.changeLanguage", "Change Language")}`}
        className={`px-2 py-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
          isOpen
            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-md shadow-cyan-500/20"
            : "bg-slate-900/80 text-slate-200 hover:text-white border-slate-800 hover:border-slate-700"
        }`}
      >
        <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span className="font-bold tracking-wide text-[11px] sm:text-xs">
          {shortCode}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {/* Accessible Searchable Popover Dropdown */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Language Selector"
          className={`absolute z-50 mt-2 w-[310px] sm:w-[360px] max-w-[92vw] rounded-2xl bg-[#0c1222]/95 backdrop-blur-2xl border border-slate-700/80 shadow-2xl shadow-cyan-950/50 p-3 transition-all animate-in fade-in zoom-in-95 duration-150 ${
            isRtl ? "left-0 sm:left-0" : "right-0 sm:right-0"
          }`}
          style={{ top: "100%" }}
        >
          {/* Header & Title */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                {t("header.changeLanguage", "Worldwide Languages")}
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              aria-label={t("common.close", "Close")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Box */}
          <div className="relative mb-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("header.searchLanguage", "Search language, name or code...")}
              className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 text-xs text-white placeholder-slate-500 transition-all outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                title="Clear search"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter Pills (hidden when searching) */}
          {!searchQuery && (
            <div className="flex items-center gap-1 overflow-x-auto pb-2 mb-2 scrollbar-none text-[10px]">
              {CATEGORIES.map((cat) => {
                const isCatActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2 py-1 rounded-lg shrink-0 font-medium transition-all ${
                      isCatActive
                        ? "bg-cyan-500/25 text-cyan-300 border border-cyan-500/40"
                        : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-transparent hover:border-slate-800"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Scrollable Language List */}
          <div
            className="max-h-[260px] sm:max-h-[300px] overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
            tabIndex={0}
          >
            {filteredLanguages.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No language found matching "{searchQuery}"
              </div>
            ) : (
              filteredLanguages.map((lang) => {
                const isSelected =
                  language.toLowerCase() === lang.code.toLowerCase() ||
                  language.toLowerCase().startsWith(lang.code.toLowerCase() + "-");

                return (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-colors group cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/60 border border-cyan-500/40 text-cyan-300"
                        : "hover:bg-slate-800/60 text-slate-300 hover:text-white border border-transparent"
                    }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0 pr-2">
                      {/* Native language name in proper Unicode */}
                      <span className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-xs truncate">
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
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
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
            <span className="text-[10px] text-slate-500">
              {supportedLanguages.length} Languages
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
