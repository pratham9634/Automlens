"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  X,
  Send,
  Trash2,
  ChevronRight,
  Bot,
  User,
  ShieldCheck,
  Zap,
  Lightbulb,
  BarChart3,
  Layers,
  GraduationCap,
  Copy,
  Check,
  Compass,
  Lock,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { apiClient } from "@/lib/api-client";
import { ChatMessage, ChatSuggestion } from "@/lib/types";

interface AnalystDrawerProps {
  projectId: string;
  projectName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalystDrawer({
  projectId,
  projectName,
  isOpen,
  onClose,
}: AnalystDrawerProps) {
  const { user } = useUser();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("gemini-3.5-flash-lite");
  const [engineMode, setEngineMode] = useState<"llm" | "deterministic" | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempKey, setTempKey] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Check for local Gemini Key & Model
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem("automlens_gemini_key");
      let model = localStorage.getItem("automlens_gemini_model") || "gemini-3.5-flash-lite";
      if (
        model.includes("2.0") ||
        model.includes("1.5") ||
        model.includes("2.5")
      ) {
        model = "gemini-3.5-flash-lite";
        localStorage.setItem("automlens_gemini_model", model);
      }
      const hasKey = Boolean(key && key.trim());
      setHasCustomKey(hasKey);
      setActiveModel(model);
      if (hasKey) {
        setEngineMode("llm");
      }
    }
  }, [isOpen]);

  // Load contextual suggestion pills & persisted message history
  useEffect(() => {
    if (isOpen && projectId) {
      apiClient
        .getChatSuggestions(projectId)
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions([]));

      apiClient
        .getChatMessages(projectId)
        .then((records) => {
          if (records && records.length > 0) {
            setMessages(
              records.map((r) => ({
                role: r.role,
                content: r.content,
                timestamp: r.created_at || undefined,
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [isOpen, projectId]);

  // Auto-scroll on new tokens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isStreaming) return;

    setInput("");
    const userMsg: ChatMessage = {
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsStreaming(true);

    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages([...newHistory, assistantMsg]);

    const abortFn = await apiClient.streamChat(
      projectId,
      query,
      messages,
      {
        onChunk: (chunk: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content += chunk;
            }
            return [...updated];
          });
        },
        onMode: (mode: "llm" | "deterministic") => {
          setEngineMode(mode);
        },
        onDone: () => {
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (err: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content = last.content || `⚠️ Lens notice: ${err}`;
            }
            return [...updated];
          });
          setIsStreaming(false);
          abortRef.current = null;
        },
      }
    );

    abortRef.current = abortFn;
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current();
      abortRef.current = null;
    }
    setIsStreaming(false);
  };

  const clearChat = async () => {
    if (isStreaming) handleStop();
    setMessages([]);
    try {
      await apiClient.clearChatMessages(projectId);
    } catch {
      // Local wipe succeeded
    }
  };

  const copyMessage = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "guidance":
        return <Compass className="w-3.5 h-3.5 text-sky-400" />;
      case "security":
        return <Lock className="w-3.5 h-3.5 text-emerald-400" />;
      case "quality":
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case "models":
        return <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />;
      case "features":
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      case "executive":
        return <GraduationCap className="w-3.5 h-3.5 text-rose-400" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const displayName = user?.firstName || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "Engineer";

  // Render markdown with headings, bold, code, and bullet lists
  const renderFormattedText = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, idx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={idx} className="font-semibold text-text-primary text-sm mt-3 mb-1.5 flex items-center gap-1.5">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("#### ")) {
        return (
          <h5 key={idx} className="font-medium text-text-secondary text-xs uppercase tracking-wider mt-2 mb-1">
            {line.replace("#### ", "")}
          </h5>
        );
      }
      if (line.startsWith("- ")) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-text-secondary my-0.5 leading-relaxed">
            {parseInline(line.replace("- ", ""))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <li key={idx} className="ml-4 list-decimal text-xs text-text-secondary my-0.5 leading-relaxed">
            {parseInline(line.replace(/^\d+\.\s/, ""))}
          </li>
        );
      }
      if (line.trim() === "") {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-xs text-text-secondary my-1 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    });
  };

  const parseInline = (text: string) => {
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-surface-subtle text-cyan-400 px-1 py-0.5 rounded font-mono text-[11px] border border-border/50">
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="text-text-primary font-semibold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 transition-opacity"
        />
      )}

      {/* Slide-over panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[480px] md:w-[560px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-[64px] px-5 border-b border-border/80 flex items-center justify-between bg-surface-subtle/50">
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-accent/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Sparkles className="w-4 h-4" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-surface" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-text-primary tracking-tight">Lens</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  ML Copilot
                </span>
                {engineMode === "llm" || (engineMode === null && hasCustomKey) ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>{activeModel} (Live)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    <span>Offline Grounded</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-text-muted">Senior Staff ML Architect • Automated Tabular Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                title="Clear conversation"
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close drawer (Esc)"
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-subtle rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Workspace Context Sub-banner */}
        <div className="px-5 py-2 border-b border-border/60 bg-surface-subtle/30 flex items-center justify-between text-[11px] font-mono text-text-muted">
          <div className="flex items-center gap-1.5 truncate max-w-[65%]">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
            <span className="truncate text-text-secondary">{projectName || "Workspace"}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck className="w-3 h-3 shrink-0" />
            <span className="truncate">Tenant: {displayName}</span>
          </div>
        </div>

        {/* Offline Grounded Mode Notice & BYOK Key Quick-Config */}
        {!hasCustomKey && (
          <div className="px-5 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300">
            <div className="flex items-center gap-1.5 truncate">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Operating in 100% Offline Rule Mode.</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="ml-2 text-[10px] font-mono underline hover:text-white shrink-0 cursor-pointer text-amber-200"
            >
              {isSettingsOpen ? "Close Key Setup" : "Connect Gemini BYOK"}
            </button>
          </div>
        )}

        {isSettingsOpen && (
          <div className="p-3 bg-surface-subtle border-b border-border space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-medium text-text-primary">
              <span>Google Gemini API Configuration (BYOK)</span>
              <button onClick={() => setIsSettingsOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste AI Studio Key (AIzaSy... / AQ...)"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                className="flex-1 bg-surface px-2.5 py-1.5 rounded border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan-500 font-mono"
              />
              <select
                value={activeModel}
                onChange={(e) => {
                  const m = e.target.value;
                  setActiveModel(m);
                  localStorage.setItem("automlens_gemini_model", m);
                }}
                className="bg-surface px-2 py-1.5 rounded border border-border text-xs text-text-primary focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Fastest)</option>
                <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  if (tempKey.trim()) {
                    localStorage.setItem("automlens_gemini_key", tempKey.trim());
                    localStorage.setItem("automlens_gemini_model", activeModel);
                    setHasCustomKey(true);
                    setEngineMode("llm");
                    setIsSettingsOpen(false);
                    setTempKey("");
                  }
                }}
                className="px-3 py-1.5 bg-cyan-500 text-white rounded text-xs font-semibold hover:bg-cyan-600 transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center px-2 py-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/10 via-cyan-500/20 to-accent/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_25px_rgba(6,182,212,0.18)]">
                <Bot className="w-7 h-7" />
              </div>
              <h3 className="font-bold text-text-primary text-base mb-1 tracking-tight">
                Greetings, {displayName}. I am Lens.
              </h3>
              <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                Your dedicated Staff Machine Learning Architect. I have live visibility into your dataset telemetry, cross-validation tournaments, overfit diagnostics, and audit logs.
              </p>

              {/* Suggested Questions */}
              {suggestions.length > 0 && (
                <div className="w-full space-y-2 text-left">
                  <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-text-muted px-1">
                    <span>Context-Aware Actions</span>
                    <span className="text-[10px] text-cyan-400">Step-by-step</span>
                  </div>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(s.prompt)}
                      className="w-full text-left p-3 rounded-lg border border-border/80 bg-surface-subtle/70 hover:bg-surface-subtle hover:border-cyan-500/50 hover:shadow-xs transition-all flex items-start gap-2.5 group cursor-pointer"
                    >
                      <div className="mt-0.5 p-1 rounded bg-surface border border-border-subtle group-hover:scale-110 transition-transform">
                        {getCategoryIcon(s.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-text-primary group-hover:text-cyan-400 transition-colors">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">
                          {s.prompt}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-cyan-400 transition-colors mt-1 shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex-shrink-0 flex items-center justify-center text-cyan-400 mt-1 shadow-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed relative ${
                    msg.role === "user"
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-surface-subtle border border-border/80 text-text-primary shadow-xs"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      {renderFormattedText(msg.content)}
                      {isStreaming && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                      )}

                      {/* Assistant footer with timestamp and copy button */}
                      <div className="mt-2.5 pt-2 border-t border-border-subtle/60 flex items-center justify-between text-[10px] text-text-muted font-mono">
                        <span>{msg.timestamp || "Lens"}</span>
                        <button
                          onClick={() => copyMessage(i, msg.content)}
                          title="Copy response"
                          className="hover:text-text-primary flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          {copiedIndex === i ? (
                            <>
                              <Check className="w-3 h-3 text-success" />
                              <span className="text-success">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {msg.timestamp && (
                        <span className="block text-[10px] mt-1.5 text-right text-white/70 font-mono">
                          {msg.timestamp}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-surface-subtle border border-border flex-shrink-0 flex items-center justify-center text-text-secondary mt-1 shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/80 bg-surface-subtle/40 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative rounded-lg border border-border bg-surface focus-within:border-cyan-500/60 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all shadow-inner">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    if (e.nativeEvent.isComposing || (e as unknown as { keyCode?: number }).keyCode === 229) {
                      return;
                    }
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask Lens about data quality, models, overfit risk, or guidance..."
                rows={2}
                disabled={isStreaming}
                className="w-full bg-transparent px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none leading-relaxed"
              />
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="h-10 px-3.5 rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 text-xs font-mono font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="h-10 px-4 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium transition-colors flex items-center justify-center shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          <div className="flex items-center justify-between text-[10px] text-text-muted font-mono px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              <span>Multi-tenant session • No data leaves workspace</span>
            </span>
            <span>Enter to send • Shift+Enter for newline</span>
          </div>
        </div>
      </aside>
    </>
  );
}
