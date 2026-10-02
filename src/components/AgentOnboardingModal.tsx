import React, { useState } from "react";
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  Globe, 
  Building2, 
  MapPin, 
  Package, 
  Users, 
  Target, 
  Languages, 
  Sliders, 
  Loader2, 
  AlertCircle,
  X
} from "lucide-react";
import { BusinessAgentConfig } from "../types";
import { safeFetchJson } from "../utils/apiHelper";
import { normalizeErrorMessage } from "../utils/errorUtils";
import { useCredits } from "../context/CreditsContext";

interface AgentOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgentCreated: (agent: BusinessAgentConfig) => void;
}

const POPULAR_INDUSTRIES = [
  "Interior Design & Architecture",
  "E-Commerce & Retail",
  "B2B Manufacturing & Wholesale",
  "Digital Marketing & SaaS",
  "Healthcare & Wellness",
  "Real Estate & Property",
  "Restaurant, Food & Hospitality",
  "Professional Services & Consulting",
  "Education & Coaching",
  "Export & International Trade",
];

const POPULAR_LANGUAGES = [
  "English",
  "Hindi (हिंदी)",
  "Bengali (বাংলা)",
  "Spanish (Español)",
  "French (Français)",
  "German (Deutsch)",
  "Arabic (العربية)",
  "Auto / Same as user",
];

const BRAND_TONES = [
  { id: "professional", label: "Professional, warm & direct", desc: "Clear, trustworthy, and solution-focused" },
  { id: "executive", label: "Executive & Analytical", desc: "High-level strategic diagnosis and data-driven guidance" },
  { id: "friendly", label: "Approachable & Creative", desc: "Conversational, modern, and engaging" },
  { id: "sales", label: "High-Converting & Persuasive", desc: "Action-oriented sales hooks and rapid client follow-ups" },
];

export const AgentOnboardingModal: React.FC<AgentOnboardingModalProps> = ({
  isOpen,
  onClose,
  onAgentCreated,
}) => {
  const { user, isAnonymous, plan } = useCredits();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 9;

  // Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [productsServices, setProductsServices] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [businessGoals, setBusinessGoals] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("English");
  const [brandTone, setBrandTone] = useState("Professional, warm & direct");

  // Loading & Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!isOpen) return null;

  const handleNext = () => {
    setErrorMessage(null);
    if (currentStep === 1 && !name.trim()) {
      setErrorMessage("Please enter your business name.");
      return;
    }
    if (currentStep === 2 && !industry.trim()) {
      setErrorMessage("Please select or enter your industry.");
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinalSubmit();
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinalSubmit = async () => {
    if (!name.trim() || !industry.trim()) {
      setErrorMessage("Business name and industry are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const locationComputed = [city.trim(), country.trim()].filter(Boolean).join(", ") || "Global";

    try {
      const data = await safeFetchJson<{
        success: boolean;
        agent: BusinessAgentConfig;
        customSystemPrompt?: string;
        recommendedWorkflowTemplates?: any[];
        initialSuggestedTasks?: any[];
        message?: string;
        error?: string;
      }>("/api/ai/agent-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim(),
          country: country.trim(),
          city: city.trim(),
          location: locationComputed,
          website: website.trim(),
          productsServices: productsServices.trim(),
          targetCustomers: targetCustomers.trim(),
          businessGoals: businessGoals.trim(),
          preferredLanguage,
          brandTone,
          userId: user?.uid || "guest",
          userPlan: plan,
          isAnonymous,
        }),
      });

      if (!data.success || !data.agent) {
        throw new Error(data.message || data.error || "Failed to generate business agent profile.");
      }

      setIsCompleted(true);
      setTimeout(() => {
        onAgentCreated(data.agent);
        onClose();
      }, 1200);
    } catch (err: unknown) {
      console.error("Agent creation failed:", err);
      setErrorMessage(normalizeErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#090d1a] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Top Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px]">
              <div className="w-full h-full rounded-[11px] bg-slate-950 flex items-center justify-center text-cyan-400">
                <Bot className="w-4 h-4" />
              </div>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                {isCompleted ? "Agent Ready" : "Build Your AI Business Agent"}
              </h2>
              <p className="text-[11px] text-slate-400">
                {isCompleted ? "Setting up your workspace..." : `Step ${currentStep} of ${totalSteps}`}
              </p>
            </div>
          </div>

          {!isSubmitting && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step Progress Bar */}
        <div className="w-full h-1 bg-slate-900 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 flex-1 overflow-y-auto">
          {isCompleted ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-900/30 animate-bounce">
                <Check className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-white">Your AI Agent is Ready!</h3>
              <p className="text-xs text-slate-400 max-w-xs">
                Your business memory is initialized. Opening your Agent Center...
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Step 1: Business Name */}
              {currentStep === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Building2 className="w-4 h-4" />
                    <span>STEP 1: BUSINESS NAME</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">What is your business called?</h3>
                  <p className="text-xs text-slate-400">
                    This will be the primary identity for your autonomous business agent.
                  </p>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Interior Studio, Royal Spices Exports"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
              )}

              {/* Step 2: Industry */}
              {currentStep === 2 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Package className="w-4 h-4" />
                    <span>STEP 2: INDUSTRY</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">What industry are you in?</h3>
                  <p className="text-xs text-slate-400">
                    Your agent uses domain-specific knowledge, trade terminology, and competitive benchmarks.
                  </p>
                  <input
                    type="text"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Select below or type your industry..."
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {POPULAR_INDUSTRIES.map((ind) => (
                      <button
                        key={ind}
                        type="button"
                        onClick={() => setIndustry(ind)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all text-left ${
                          industry === ind 
                            ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300 font-semibold"
                            : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: Country / City */}
              {currentStep === 3 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <MapPin className="w-4 h-4" />
                    <span>STEP 3: LOCATION</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Where is your business based?</h3>
                  <p className="text-xs text-slate-400">
                    Powers local SEO analysis, regional buyer intent, and market benchmarks.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">Country</label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="e.g. India, United States, UK"
                        autoFocus
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">City / Region</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Kolkata, Mumbai, New York"
                        onKeyDown={(e) => e.key === "Enter" && handleNext()}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Website */}
              {currentStep === 4 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Globe className="w-4 h-4" />
                    <span>STEP 4: WEBSITE (OPTIONAL)</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Do you have a website?</h3>
                  <p className="text-xs text-slate-400">
                    If provided, the agent can analyze your landing page, metadata, and mobile performance.
                  </p>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                  <p className="text-[11px] text-slate-500">
                    You can leave this blank if you don&rsquo;t have a website yet.
                  </p>
                </div>
              )}

              {/* Step 5: Products / Services */}
              {currentStep === 5 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Package className="w-4 h-4" />
                    <span>STEP 5: PRODUCTS & SERVICES</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">What do you sell?</h3>
                  <p className="text-xs text-slate-400">
                    List your main offerings, packages, or core catalog.
                  </p>
                  <textarea
                    rows={3}
                    value={productsServices}
                    onChange={(e) => setProductsServices(e.target.value)}
                    placeholder="e.g. 2BHK/3BHK luxury turnkey interior design, modular kitchen installations, 3D architectural rendering"
                    autoFocus
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-cyan-500 resize-none"
                  />
                </div>
              )}

              {/* Step 6: Target Customers */}
              {currentStep === 6 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Users className="w-4 h-4" />
                    <span>STEP 6: TARGET CUSTOMERS</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Who is your ideal customer?</h3>
                  <p className="text-xs text-slate-400">
                    Helps the agent draft high-converting hooks and accurate outreach scripts.
                  </p>
                  <input
                    type="text"
                    value={targetCustomers}
                    onChange={(e) => setTargetCustomers(e.target.value)}
                    placeholder="e.g. New flat owners in gated communities, B2B wholesale buyers, busy tech founders"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
              )}

              {/* Step 7: Main Business Goals */}
              {currentStep === 7 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Target className="w-4 h-4" />
                    <span>STEP 7: MAIN BUSINESS GOALS</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">What is your #1 goal right now?</h3>
                  <p className="text-xs text-slate-400">
                    The agent focuses its immediate diagnostics and recommended actions on this priority.
                  </p>
                  <input
                    type="text"
                    value={businessGoals}
                    onChange={(e) => setBusinessGoals(e.target.value)}
                    placeholder="e.g. Double monthly inbound leads, rank #1 in local Google searches, launch export catalog"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
                  />
                </div>
              )}

              {/* Step 8: Preferred Language */}
              {currentStep === 8 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Languages className="w-4 h-4" />
                    <span>STEP 8: AGENT LANGUAGE</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Select Agent Response Language</h3>
                  <p className="text-xs text-slate-400">
                    The language your agent defaults to when writing customer replies, plans, and reports.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {POPULAR_LANGUAGES.map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setPreferredLanguage(lang)}
                        className={`text-xs p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                          preferredLanguage === lang
                            ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-300 font-bold"
                            : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span>{lang}</span>
                        {preferredLanguage === lang && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 9: Brand Tone */}
              {currentStep === 9 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold">
                    <Sliders className="w-4 h-4" />
                    <span>STEP 9: BRAND TONE</span>
                  </div>
                  <h3 className="text-lg font-bold text-white">Choose your agent&rsquo;s voice</h3>
                  <p className="text-xs text-slate-400">
                    Defines how your agent communicates with you and prepares customer outreach.
                  </p>
                  <div className="space-y-2">
                    {BRAND_TONES.map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setBrandTone(tone.label)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between ${
                          brandTone === tone.label
                            ? "bg-cyan-950/70 border-cyan-500/60 text-cyan-200"
                            : "bg-slate-900/70 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-white">{tone.label}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{tone.desc}</div>
                        </div>
                        {brandTone === tone.label && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Notice */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!isCompleted && (
          <div className="px-5 sm:px-6 py-4 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleNext}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating your agent...</span>
                </>
              ) : currentStep === totalSteps ? (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create My AI Agent</span>
                </>
              ) : (
                <>
                  <span>Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
