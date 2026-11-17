"use client";

import { useEffect, useState } from "react";
import { Sparkles, Key, CheckCircle2, Trash2, ExternalLink, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const GEMINI_KEY_STORAGE_NAME = "automlens_gemini_key";

interface BYOKModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export function BYOKModal({ isOpen, onClose, onKeyUpdated }: BYOKModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const existing = localStorage.getItem(GEMINI_KEY_STORAGE_NAME);
      if (existing) {
        setSavedKey(existing);
        setApiKey(existing);
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem(GEMINI_KEY_STORAGE_NAME, apiKey.trim());
      setSavedKey(apiKey.trim());
      setIsSaved(true);
      window.dispatchEvent(new Event("automlens_byok_updated"));
      if (onKeyUpdated) onKeyUpdated();
      setTimeout(() => {
        setIsSaved(false);
        onClose();
      }, 700);
    }
  };

  const handleClear = () => {
    localStorage.removeItem(GEMINI_KEY_STORAGE_NAME);
    setApiKey("");
    setSavedKey(null);
    window.dispatchEvent(new Event("automlens_byok_updated"));
    if (onKeyUpdated) onKeyUpdated();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-surface border-border p-6 shadow-2xl rounded-xl">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-text-primary">
              Bring Your Own Gemini API Key
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-text-muted leading-relaxed">
            AutoMLens uses Google Gemini 2.0 Flash to power contextual dataset analysis, feature
            recommendations, and viva defense explanations for free.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center justify-between">
              <span>Google Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 font-mono"
              >
                Get free key <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <div className="relative">
              <Input
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs pr-8 bg-surface-subtle border-border focus:border-cyan-500/50"
              />
              <Key className="w-3.5 h-3.5 text-text-subtle absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="p-3 bg-surface-subtle rounded-lg border border-border/80 text-[11px] space-y-1 text-text-muted">
            <div className="flex items-center gap-1.5 text-text-primary font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              <span>Zero-Storage Privacy Guarantee</span>
            </div>
            <p>
              Your key is kept strictly in your browser local storage and sent directly to
              Gemini/FastAPI headers. It is never logged or stored in the database.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            {savedKey ? (
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                className="text-xs text-danger hover:text-danger/80 hover:bg-danger/10 gap-1.5 h-8 px-2.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove Key
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="text-xs h-8 border-border hover:bg-surface-subtle"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="text-xs h-8 bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                {isSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                    Saved
                  </>
                ) : (
                  "Save & Activate"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
