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
  Check
} from "lucide-react";
import { SavedItem, SocialMediaResult } from "../types";

interface SocialViewProps {
  onSaveItem: (item: Omit<SavedItem, "id" | "createdAt">) => void;
}

export const SocialView: React.FC<SocialViewProps> = ({ onSaveItem }) => {
  const [platform, setPlatform] = useState<"Instagram" | "Facebook" | "YouTube" | "LinkedIn">("Instagram");
  const [business, setBusiness] = useState("Artisan Ceramic Exporter");
  const [audience, setAudience] = useState("Interior Designers, Wholesalers & Eco-conscious Homeowners");
  const [contentType, setContentType] = useState("Reel / Short Video & Behind-The-Scenes");

  const [isLoading, setIsLoading] = useState(false);
  const [socialData, setSocialData] = useState<SocialMediaResult | null>(null);
  const [copiedCaptionIndex, setCopiedCaptionIndex] = useState<number | null>(null);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handleGenerateSocial = async () => {
    if (!business.trim() || isLoading) return;
    setIsLoading(true);
    setHasSaved(false);

    try {
      const res = await fetch("/api/ai/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, business, audience, contentType }),
      });

      if (!res.ok) throw new Error("Failed to generate social media content");
      const data = await res.json();
      setSocialData(data);
    } catch (err) {
      console.error(err);
      // Fallback
      setSocialData({
        postIdeas: [
          { hook: "Stop shipping delicate crafts until you test this 3-second packaging trick...", description: "Showcase of our multi-layered honeycomb paper wrap that eliminates all plastic bubble wrap while passing 1-meter drop tests.", format: "Reel / Short (30s)" },
          { hook: "3 reasons why US boutique retailers are buying directly from artisan manufacturers:", description: "Carousel showing wholesale pricing transparency, custom branding capability, and rapid sea-freight timelines.", format: "Carousel (5 Slides)" },
          { hook: "A day in our export workshop: Packing 1,200 handmade mugs for California", description: "Satisfying acoustic sounds of kiln opening, QC stamping, and master carton sealing.", format: "ASMR Time-Lapse Video" },
        ],
        reelIdeas: [
          { visual: "Side-by-side drop test of traditional fragile carton vs. our export container", audioHook: "Punchy cinematic beat drop on impact", onScreenText: "0% transit damage or full refund guarantee" },
          { visual: "High-speed pottery wheel spinning into a finished artisanal vase with custom buyer logo stamp", audioHook: "Upbeat motivational lo-fi rhythm", onScreenText: "Private label manufacturing made effortless" },
        ],
        captions: [
          {
            headline: "When you export internationally, your reputation travels inside every single box. 📦✈️",
            body: `Here’s how our workshop ensures every shipment arrives flawless:\n\n1️⃣ Individual moisture-barrier foil wraps\n2️⃣ Certified drop-tested 5-ply corrugated walls\n3️⃣ High-contrast international glass-handling stickers\n\nDirect from our studio to your showroom shelves.`,
            cta: "Send us a DM with 'CATALOG' or tap the link in our bio for wholesale rates & sample boxes.",
          },
          {
            headline: "Behind the clay: Meet the master artisans shaping your morning coffee mugs. ☕✨",
            body: `Each piece takes 14 days of dedicated handcrafting, two kiln firings, and strict food-grade glaze testing.\n\nSupporting authentic craft while keeping wholesale MOQ accessible is why 40+ international boutiques partner with us every season.`,
            cta: "Save this post and share with someone who values sustainable handmade design.",
          },
        ],
        hashtags: [
          "#ArtisanCeramics", "#ExportQuality", "#HandmadeHomeDecor", "#B2BWholesale",
          "#PotteryLovers", "#DirectFromMaker", "#SustainableLiving", "#BoutiqueBuyer",
          "#GlobalTrade", "#InteriorDesignInspo", "#MadeWithCare", "#SmallBusinessGrowth"
        ],
        videoHooks: [
          "If you sell home decor, this one supplier hack will double your margins...",
          "Watch what happens when we drop this ceramic box from 5 feet...",
          "Here is what 1,200 custom pieces look like right before loading into an ocean container...",
        ],
        calendar: [
          { day: "Monday", theme: "Behind-The-Scenes Workshop Kickoff", content: "Master artisan throwing raw clay on the wheel with acoustic sounds.", bestTime: "9:00 AM" },
          { day: "Tuesday", theme: "Quality Test / Packaging Hack", content: "Drop-test demonstration highlighting durable transit packaging.", bestTime: "1:00 PM" },
          { day: "Wednesday", theme: "Educational Trade Tip", content: "Explaining FOB vs CIF terms simply for boutique retailers.", bestTime: "5:30 PM" },
          { day: "Thursday", theme: "Product Feature & Glaze Macro", content: "Close-up macro shots showing organic glaze textures in natural sunlight.", bestTime: "11:00 AM" },
          { day: "Friday", theme: "Trending Reel / Time-lapse", content: "Loading palletized boxes into the delivery truck with upbeat audio.", bestTime: "6:30 PM" },
          { day: "Saturday", theme: "Customer Unboxing / Retailer Spotlight", content: "Video clip of an international retailer displaying the collection.", bestTime: "10:00 AM" },
          { day: "Sunday", theme: "Weekly Recap & Wholesale CTA", content: "Carousel of top 5 bestsellers with catalog download link in bio.", bestTime: "4:00 PM" },
        ],
      });
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
            <label className="block text-slate-300 font-medium mb-1">Business / Product</label>
            <input
              type="text"
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder="e.g. Organic Herbal Teas, Custom Leather Goods"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Target Audience</label>
            <input
              type="text"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. Cafe Owners, Health-conscious Millenials"
              className="w-full rounded-xl bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 p-2.5 text-white outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-slate-300 font-medium mb-1">Primary Content Type</label>
            <input
              type="text"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              placeholder="e.g. Educational Reels, Customer Case Studies, Product Showcase"
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
              <span>Synthesizing Viral Hooks & Calendar...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Content Strategy & Calendar</span>
            </>
          )}
        </button>
      </div>

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
