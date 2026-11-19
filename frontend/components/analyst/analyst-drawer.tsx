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
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { ChatMessage, ChatSuggestion } from "@/lib/types";

interface AnalystDrawerProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function AnalystDrawer({ projectId, isOpen, onClose }: AnalystDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState<ChatSuggestion[]>([]);
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [activeModel, setActiveModel] = useState<string>("gemini-2.0-flash");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  // Check for local Gemini Key & Model
  useEffect(() => {
    if (typeof window !== "undefined") {
      const key = localStorage.getItem("automlens_gemini_key");
      const model = localStorage.getItem("automlens_gemini_model") || "gemini-2.0-flash";
      setHasCustomKey(Boolean(key && key.trim()));
      setActiveModel(model);
    }
  }, [isOpen]);

  // Load contextual suggestion pills
  useEffect(() => {
    if (isOpen && projectId) {
      apiClient
        .getChatSuggestions(projectId)
        .then((data) => setSuggestions(data))
        .catch(() => setSuggestions([]));
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
        onDone: () => {
          setIsStreaming(false);
          abortRef.current = null;
        },
        onError: (err: string) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last && last.role === "assistant") {
              last.content = last.content || `⚠️ Analyst notice: ${err}`;
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

  const clearChat = () => {
    if (isStreaming) handleStop();
    setMessages([]);
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "quality":
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case "models":
        return <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />;
      case "features":
        return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
      case "executive":
        return <GraduationCap className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

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
    // Basic inline code and bold parser
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
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[480px] md:w-[540px] bg-surface border-l border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="h-[60px] px-5 border-b border-border/80 flex items-center justify-between bg-surface-subtle/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-text-primary">Tabular AI Analyst</span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {hasCustomKey ? `${activeModel} (BYOK)` : "Hybrid AI"}
                </span>
              </div>
              <p className="text-[11px] text-text-muted">Dataset insights, leaderboard analysis &amp; AutoML copilot</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={clearChat}
                title="Clear chat history"
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col justify-center items-center text-center px-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                <Bot className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-text-primary text-sm mb-1">
                Ask anything about your data & models
              </h3>
              <p className="text-xs text-text-muted max-w-sm mb-6 leading-relaxed">
                I have real-time visibility into your statistical profiles, data quality warnings, 
                leaderboard metrics, and SHAP feature importances.
              </p>

              {/* Suggested Questions */}
              {suggestions.length > 0 && (
                <div className="w-full space-y-2 text-left">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted block mb-1">
                    Suggested Questions
                  </span>
                  {suggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSend(s.prompt)}
                      className="w-full text-left p-3 rounded-lg border border-border/80 bg-surface-subtle/70 hover:bg-surface-subtle hover:border-cyan-500/40 transition-all flex items-start gap-2.5 group"
                    >
                      <div className="mt-0.5">{getCategoryIcon(s.category)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-text-primary group-hover:text-cyan-400 transition-colors">
                          {s.title}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">
                          {s.prompt}
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-text-muted group-hover:text-cyan-400 transition-colors mt-1" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex-shrink-0 flex items-center justify-center text-cyan-400 mt-1">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-cyan-500 text-white shadow-sm"
                      : "bg-surface-subtle border border-border/80 text-text-primary"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div>
                      {renderFormattedText(msg.content)}
                      {isStreaming && i === messages.length - 1 && (
                        <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-400 animate-pulse align-middle" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}
                  {msg.timestamp && (
                    <span
                      className={`block text-[10px] mt-1.5 text-right ${
                        msg.role === "user" ? "text-white/70" : "text-text-muted"
                      }`}
                    >
                      {msg.timestamp}
                    </span>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-surface-subtle border border-border flex-shrink-0 flex items-center justify-center text-text-secondary mt-1">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/80 bg-surface-subtle/30">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative rounded-lg border border-border bg-surface focus-within:border-cyan-500/50 transition-colors">
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
                placeholder="Ask about data quality, models, or SHAP..."
                rows={2}
                disabled={isStreaming}
                className="w-full bg-transparent px-3 py-2 text-xs text-text-primary placeholder:text-text-muted resize-none focus:outline-none"
              />
            </div>
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="h-9 px-3 rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="h-9 px-3.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium transition-colors flex items-center justify-center shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-text-muted font-sans px-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Dataset remains confidential
            </span>
            <span>Enter to send • Shift+Enter for newline</span>
          </div>
        </div>
      </aside>
    </>
  );
}
