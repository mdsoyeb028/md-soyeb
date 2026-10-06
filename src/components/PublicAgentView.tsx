import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Send, 
  Sparkles, 
  Lock, 
  Globe, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  Loader2, 
  AlertCircle 
} from "lucide-react";
import { BusinessAgentConfig } from "../types";
import { safeFetchJson } from "../utils/apiHelper";
import { getPublicBusinessAgent } from "../services/storageService";

interface PublicAgentViewProps {
  agent?: BusinessAgentConfig | null;
  agentId?: string | null;
  onBackToApp?: () => void;
  isEmbed?: boolean;
}

export const PublicAgentView: React.FC<PublicAgentViewProps> = ({
  agent: initialAgent,
  agentId,
  onBackToApp,
  isEmbed: explicitEmbed,
}) => {
  const [resolvedAgent, setResolvedAgent] = useState<BusinessAgentConfig | null>(initialAgent || null);
  const [isLoadingAgent, setIsLoadingAgent] = useState<boolean>(!initialAgent && Boolean(agentId));

  const isEmbed = Boolean(
    explicitEmbed || 
    (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("embed") === "true")
  );

  useEffect(() => {
    let isMounted = true;
    if (!resolvedAgent && agentId) {
      setIsLoadingAgent(true);
      getPublicBusinessAgent(agentId)
        .then((found) => {
          if (isMounted) {
            setResolvedAgent(found);
            if (found) {
              setMessages([
                {
                  role: "assistant",
                  content: `Hello! I am the AI Assistant for ${found.name || "this business"}. How can I assist you with our products, services, or inquiries today?`,
                },
              ]);
            }
          }
        })
        .catch((err) => {
          console.warn("Could not load public agent:", err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingAgent(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [agentId, resolvedAgent]);

  const agent = resolvedAgent;
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content: `Hello! I am the AI Assistant for ${agent?.name || "this business"}. How can I assist you with our products, services, or inquiries today?`,
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  if (isLoadingAgent) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mb-3" />
        <p className="text-xs text-slate-400">Loading AI Business Agent...</p>
      </div>
    );
  }

  // If agent does not exist or owner marked it private
  if (!agent || !agent.isPublic) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 shadow-xl">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">This Business Agent is Private</h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-6 leading-relaxed">
          The owner of this agent has not published a public customer page. Only authenticated workspace owners can access its intelligence.
        </p>
        {onBackToApp && !isEmbed && (
          <button
            onClick={onBackToApp}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Workspace</span>
          </button>
        )}
      </div>
    );
  }

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputMessage.trim();
    if (!query || isSending) return;

    setInputMessage("");
    setErrorNotice(null);

    const userMsg = { role: "user" as const, content: query };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      // Build safe public agent context (NO private documents or internal instructions)
      const publicAgentSafeConfig: Partial<BusinessAgentConfig> = {
        name: agent.name,
        businessName: agent.businessName || agent.name,
        industry: agent.industry,
        location: agent.location,
        website: agent.website,
        productsServices: agent.productsServices,
        description: agent.publicDescription || agent.description,
        preferredLanguage: agent.preferredLanguage,
        brandTone: agent.brandTone,
      };

      const data = await safeFetchJson<{
        success: boolean;
        replyText?: string;
        response?: string;
        message?: string;
        error?: string;
      }>("/api/ai/agent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          agentConfig: publicAgentSafeConfig,
          conversationHistory: messages.slice(-6),
          language: agent.preferredLanguage || "English",
          mode: "public_customer_inquiry",
        }),
      });

      if (!data.success) {
        throw new Error(data.message || data.error || "Unable to reach the assistant.");
      }

      const reply = data.replyText || data.response || "Thank you for reaching out! Our team has recorded your inquiry.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      console.error("Public chat error:", err);
      setErrorNotice("AI service is temporarily unavailable. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={isEmbed ? "w-full h-full p-2 flex flex-col gap-3 min-h-[500px]" : "w-full max-w-2xl mx-auto py-6 px-3 flex flex-col gap-4"}>
      {/* Top Banner with Business Identity */}
      <div className="rounded-2xl bg-[#090d1a] border border-slate-800 p-4 sm:p-5 flex items-center justify-between shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 p-[1px] shadow-lg shadow-cyan-950/40">
            <div className="w-full h-full rounded-[15px] bg-slate-950 flex items-center justify-center text-cyan-400 font-bold text-lg">
              {agent.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">{agent.name}</h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                <CheckCircle2 className="w-3 h-3" />
                Verified Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {agent.industry} {agent.location ? `• ${agent.location}` : ""}
            </p>
          </div>
        </div>

        {onBackToApp && !isEmbed && (
          <button
            onClick={onBackToApp}
            className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Owner View
          </button>
        )}
      </div>

      {/* Public Description if provided */}
      {(agent.publicDescription || agent.description) && (
        <div className="px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300">
          {agent.publicDescription || agent.description}
        </div>
      )}

      {/* Customer Chat Interface */}
      <div className={`rounded-2xl bg-[#090d1a] border border-slate-800 shadow-xl flex flex-col overflow-hidden ${
        isEmbed ? "flex-1 min-h-[380px]" : "h-[520px]"
      }`}>
        {/* Chat Messages */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-tr-sm"
                    : "bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center gap-2 text-slate-400 text-xs pl-9">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>{agent.name} Assistant is typing...</span>
            </div>
          )}

          {errorNotice && (
            <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorNotice}</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800/80 bg-slate-950/60 flex items-center gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask ${agent.name} about services, pricing, or inquiries...`}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-40 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>

      <div className="text-center text-[11px] text-slate-500">
        Powered by MD SOYEB AI • Official Public Customer Assistant
      </div>
    </div>
  );
};
