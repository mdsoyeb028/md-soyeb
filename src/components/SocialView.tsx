import React, { useState } from "react";
import { 
  Smartphone, 
  Instagram, 
  Facebook, 
  Youtube, 
  Linkedin, 
  Copy, 
  BookmarkCheck, 
  Calendar as CalendarIcon, 
  Sparkles, 
  Video, 
  Hash, 
  Flame, 
  Loader2,
  Check,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { SavedItem, SocialMediaResult } from "../types";
import { normalizeErrorMessage } from "../utils/errorUtils";

interface SocialViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const SocialView: React.FC<SocialViewProps> = ({ onSaveItem }) => {
  const [platform, setPlatform] = useState<"Instagram" | "Facebook" | "YouTube" | "LinkedIn">("Instagram");
  const [business, setBusiness] = useState("Artisan Ceramic Exporter");
  const [category, setCategory] = useState("Ceramics & Global Home Decor");
  const [audience, setAudience] = useState("Interior Designers, Wholesalers & Eco-conscious Homeowners");
  const [topic, setTopic] = useState("Master Artisans, Handcrafting & Safe Global Freight");
  const [language, setLanguage] = useState("English");
  const [contentType, setContentType] = useState("Reel / Short Video & Behind-The-Scenes");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [socialData, setSocialData] = useState<SocialMediaResult | null>(null);
  const [copiedCaptionIndex, setCopiedCaptionIndex] = useState<number | null>(null);
  const [copiedCtaIndex, setCopiedCtaIndex] = useState<number | null>(null);
  const [copiedPlatformField, setCopiedPlatformField] = useState<string | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleGenerateSocial = async () => {
    if (!business.trim()) {
      setErrorMessage("Please enter your business or brand name before generating content.");
      return;
    }
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);
    setHasSaved(false);

    try {
      const res = await fetch("/api/ai/social", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json" 
        },
        body: JSON.stringify({ 
          platform, 
          business: business.trim(), 
          category: category.trim(),
          audience: audience.trim(), 
          topic: topic.trim(),
          language: language.trim(),
          contentType: contentType.trim() 
        }),
      });

      // Defensive check: Verify response content-type before parsing JSON
      const contentTypeHeader = res.headers.get("content-type") || "";
      if (!contentTypeHeader.includes("application/json")) {
        const rawText = await res.text();
        const snippet = rawText.slice(0, 100).replace(/<[^>]*>/g, "").trim();
        throw new Error(
          `The server returned a non-JSON response (HTTP ${res.status}). ${
            snippet ? `Detail: "${snippet}"` : "The social media AI endpoint may be temporarily unreachable."
          }`
        );
      }

      const data = await res.json();
      if (!res.ok || data.success === false) {
        const errorDetail = normalizeErrorMessage(data.error, `Social content generation failed (HTTP ${res.status}).`);
        throw new Error(errorDetail);
      }

      const result: SocialMediaResult = data.data || data;
      setSocialData(result);
    } catch (err: unknown) {
      console.error("Social generation error:", err);
      const msg = normalizeErrorMessage(err, "Failed to generate social media strategy.");
      setErrorMessage(msg);
      setSocialData(null); // Never replace failed real requests with fake data
    } finally {
      setIsLoading(false);
    }
  };

  const copyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionIndex(index);
    setTimeout(() => setCopiedCaptionIndex(null), 2000);
  };

  const copyHashtags = () => {
    if (!socialData) return;
    navigator.clipboard.writeText(socialData.hashtags.join(" "));
    setCopiedHashtags(true);
    setTimeout(() => setCopiedHashtags(false), 2000);
  };

  const handleSave = () => {
    if (!socialData || hasSaved) return;
    onSaveItem({
      type: "social",
      title: `${platform} Growth Campaign: ${business}`,
      summary: `Target: ${audience}. Includes 7-day calendar, reels hooks & hashtags.`,
      content: JSON.stringify(socialData, null, 2),
      category: "Social Media Strategy",
      tags: [platform, business, "Content Plan"],
    });
    setHasSaved(true);
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-indigo-950/60 border border-purple-500/30 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider mb-1">
          <Smartphone className="w-4 h-4" />
          <span>Multi-Channel Social Growth Engine</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">
          Social Content & Reels Studio
        </h1>
        <p className="text-xs text-slate-300 mt-1">
          Generate viral reel hooks, high-converting captions, niche hashtags, and a structured 7-day content calendar.
        </p>
      </div>

      {/* Platform Selector */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/70 border border-slate-800 backdrop-blur-xl space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Select Channel
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "Instagram", icon: Instagram, color: "text-pink-400 border-pink-500/40" },
              { id: "Facebook", icon: Facebook, color: "text-blue-400 border-blue-500/40" },
              { id: "YouTube", icon: Youtube, color: "text-red-400 border-red-500/40" },
              { id: "LinkedIn", icon: Linkedin, color: "text-cyan-400 border-cyan-500/40" },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = platform === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id as typeof platform)}
                  className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all ${
                    isSelected
                      ? `bg-purple-950/60 border-purple-400 text-white shadow-md shadow-purple-500/20`
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{p.id}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Input fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Business / Brand Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="e.g. Artisan Ceramic Exporter, Organic Tea Co."
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Industry / Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Home Decor & Ceramics, FMCG, B2B Export"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Target Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Interior Designers, Wholesalers, Eco-shoppers"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Output Language</label>
            <input
              type="text"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. English, Spanish, Arabic, French, German"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Content Topic / Focus</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Master Artisans, Kiln Process, Safe Freight"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Primary Content Type</label>
            <input
              type="text"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              placeholder="e.g. Reel / Short Video, Carousel, Thought Leadership"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>
        </div>

        <button
          id="generate-social-btn"
          onClick={handleGenerateSocial}
          disabled={isLoading || !business.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 transition-all disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Real Strategy with Gemini AI...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Content Strategy & Calendar</span>
            </>
          )}
        </button>
      </div>

      {/* Error Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 backdrop-blur-xl space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>Generation Could Not Be Completed</span>
          </div>
          <p className="text-xs text-rose-200/90 leading-relaxed">
            {errorMessage}
          </p>
          <button
            onClick={handleGenerateSocial}
            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-semibold border border-rose-700 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Generation</span>
          </button>
        </div>
      )}

      {/* Generated Content Results */}
      {socialData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              {platform} Campaign Blueprint
            </h2>
            <button
              onClick={handleSave}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                hasSaved
                  ? "bg-emerald-950 text-emerald-300 border-emerald-700"
                  : "bg-purple-950 hover:bg-purple-900 text-purple-300 border-purple-700"
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>{hasSaved ? "Saved to Calendar" : "Save Plan"}</span>
            </button>
          </div>

          {/* Platform Specific Highlight Deliverable */}
          {socialData.platformDeliverables && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-purple-950/40 border border-purple-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  <span>Channel Deliverable: {platform} Blueprint</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">Format Optimized</span>
              </div>

              {platform === "YouTube" && socialData.platformDeliverables.youtube && (
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-bold uppercase tracking-wider text-[11px]">YouTube Video Title (High CTR)</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialData.platformDeliverables?.youtube?.videoTitle || "");
                          setCopiedPlatformField("yt-title");
                          setTimeout(() => setCopiedPlatformField(null), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                      >
                        {copiedPlatformField === "yt-title" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlatformField === "yt-title" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-white font-semibold text-sm">{socialData.platformDeliverables.youtube.videoTitle}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 font-bold uppercase tracking-wider text-[11px]">SEO Description & Outline</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialData.platformDeliverables?.youtube?.videoDescription || "");
                          setCopiedPlatformField("yt-desc");
                          setTimeout(() => setCopiedPlatformField(null), 2000);
                        }}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                      >
                        {copiedPlatformField === "yt-desc" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlatformField === "yt-desc" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">{socialData.platformDeliverables.youtube.videoDescription}</p>
                  </div>

                  {socialData.platformDeliverables.youtube.shortsIdea && (
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                      <span className="text-amber-400 font-bold uppercase tracking-wider text-[11px]">YouTube Shorts Fast-Paced Concept</span>
                      <p className="text-slate-200">{socialData.platformDeliverables.youtube.shortsIdea}</p>
                    </div>
                  )}
                </div>
              )}

              {platform === "LinkedIn" && socialData.platformDeliverables.linkedin && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-cyan-400 font-bold uppercase tracking-wider text-[11px]">LinkedIn B2B Thought Leadership Post</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialData.platformDeliverables?.linkedin?.thoughtLeadershipPost || "");
                          setCopiedPlatformField("li-post");
                          setTimeout(() => setCopiedPlatformField(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                      >
                        {copiedPlatformField === "li-post" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlatformField === "li-post" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {socialData.platformDeliverables.linkedin.thoughtLeadershipPost}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-cyan-300">
                      <strong>Executive Takeaway: </strong>
                      {socialData.platformDeliverables.linkedin.keyTakeaway}
                    </div>
                  </div>
                </div>
              )}

              {platform === "Facebook" && socialData.platformDeliverables.facebook && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold uppercase tracking-wider text-[11px]">Facebook Community Post</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialData.platformDeliverables?.facebook?.postContent || "");
                          setCopiedPlatformField("fb-post");
                          setTimeout(() => setCopiedPlatformField(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                      >
                        {copiedPlatformField === "fb-post" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlatformField === "fb-post" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {socialData.platformDeliverables.facebook.postContent}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-amber-300">
                      <strong>Discussion Prompt: </strong>
                      {socialData.platformDeliverables.facebook.engagementQuestion}
                    </div>
                  </div>
                </div>
              )}

              {platform === "Instagram" && socialData.platformDeliverables.instagram && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-pink-400 font-bold uppercase tracking-wider text-[11px]">Ready-to-Post Instagram Caption</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(socialData.platformDeliverables?.instagram?.caption || "");
                          setCopiedPlatformField("ig-cap");
                          setTimeout(() => setCopiedPlatformField(null), 2000);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px]"
                      >
                        {copiedPlatformField === "ig-cap" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPlatformField === "ig-cap" ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {socialData.platformDeliverables.instagram.caption}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-800/80 text-purple-300">
                      <strong>Reel 3-Second Hook: </strong>
                      “{socialData.platformDeliverables.instagram.reelHook}”
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Call-to-Action Suggestions */}
          {socialData.ctaSuggestions && socialData.ctaSuggestions.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Call-to-Action (CTA) Recommendations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {socialData.ctaSuggestions.map((cta, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-slate-300"
                  >
                    <span>{cta}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(cta);
                        setCopiedCtaIndex(idx);
                        setTimeout(() => setCopiedCtaIndex(null), 2000);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-emerald-300 shrink-0 ml-1.5"
                    >
                      {copiedCtaIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* High Impact Video Hooks */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Flame className="w-4 h-4" />
              <span>Attention-Grabbing Video Hooks (First 3 Seconds)</span>
            </div>
            <div className="space-y-2 text-xs">
              {socialData.videoHooks.map((hook, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-slate-200">
                  <span>“{hook}”</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(hook);
                    }}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-300 shrink-0 ml-2"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Reel & Post Ideas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Reel Ideas */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <Video className="w-4 h-4" />
                <span>Reel & Short Storyboard Ideas</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {socialData.reelIdeas.map((reel, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="font-semibold text-white">🎬 Visual: {reel.visual}</div>
                    <div className="text-[11px] text-purple-300">🎵 Audio Hook: {reel.audioHook}</div>
                    <div className="text-[11px] text-slate-400">📝 On-Screen Text: “{reel.onScreenText}”</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Post Ideas */}
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                <span>Carousel & Feed Post Concepts</span>
              </div>
              <div className="space-y-2.5 text-xs">
                {socialData.postIdeas.map((post, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{post.hook}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 shrink-0 ml-1">
                        {post.format}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{post.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Ready-to-use Captions with Copy */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3.5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              High-Converting Captions & CTAs
            </h3>

            <div className="space-y-3">
              {socialData.captions.map((cap, idx) => {
                const fullText = `${cap.headline}\n\n${cap.body}\n\n${cap.cta}`;
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
                      <span className="font-bold text-slate-200">Option {idx + 1}</span>
                      <button
                        onClick={() => copyCaption(fullText, idx)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium flex items-center gap-1.5 transition-colors border border-slate-700"
                      >
                        {copiedCaptionIndex === idx ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Caption</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                      <strong className="text-white block mb-1">{cap.headline}</strong>
                      {cap.body}
                      <p className="text-cyan-300 mt-2 font-medium">👉 {cap.cta}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hashtags Cluster */}
          <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                <Hash className="w-4 h-4" />
                <span>Niche & Industry Hashtags</span>
              </div>
              <button
                onClick={copyHashtags}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium flex items-center gap-1 transition-colors border border-slate-700"
              >
                {copiedHashtags ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedHashtags ? "Copied All" : "Copy All"}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {socialData.hashtags.map((tag, i) => (
                <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-cyan-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Weekly Content Calendar (Monday - Sunday) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
                <CalendarIcon className="w-4 h-4" />
                <span>7-Day Strategic Content Calendar</span>
              </div>
              <span className="text-[11px] text-slate-400">Weekly Cadence</span>
            </div>

            <div className="divide-y divide-slate-800/80">
              {socialData.calendar.map((cal, idx) => (
                <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-[120px]">
                    <span className="w-20 font-bold text-white">{cal.day}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 whitespace-nowrap">
                      {cal.bestTime}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="font-semibold text-slate-200 block sm:inline mr-2">
                      {cal.theme}:
                    </span>
                    <span className="text-slate-400">{cal.content}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
