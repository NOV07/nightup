"use client";

import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { tr, type Lang, type TranslationKey } from "../lib/translations";

interface LanguageContextValue {
  lang: Lang;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "el",
  toggleLang: () => {},
  t: (key) => tr(key, "el"),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("el");

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nightup_lang") as Lang | null;
      if (saved === "el" || saved === "en") setLang(saved);
    } catch {
      // localStorage not available
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === "el" ? "en" : "el";
      try { localStorage.setItem("nightup_lang", next); } catch {}
      return next;
    });
  }, []);

  const t = useCallback((key: TranslationKey) => tr(key, lang), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

// ── useTranslate — dynamic content translation ──────────────────

const translationCache = new Map<string, string>();

export function useTranslate() {
  const { lang } = useLanguage();
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const pendingRef = useRef<Set<string>>(new Set());

  const translate = useCallback(
    async (text: string): Promise<string> => {
      if (!text || lang === "el") return text;

      // Check cache
      const cacheKey = `${text}`;
      if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;
      const local = translations[cacheKey];
      if (local) return local;

      // Already pending
      if (pendingRef.current.has(cacheKey)) return text;
      pendingRef.current.add(cacheKey);

      setLoading(true);
      try {
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const { translation } = await res.json();
          translationCache.set(cacheKey, translation);
          setTranslations((prev) => ({ ...prev, [cacheKey]: translation }));
          return translation;
        }
      } catch {
        // fall through — return original
      } finally {
        pendingRef.current.delete(cacheKey);
        setLoading(false);
      }
      return text;
    },
    [lang, translations],
  );

  return { translate, loading, lang };
}

// ── useAutoTranslate — auto-translate a string when lang changes ──

export function useAutoTranslate(text: string) {
  const { lang } = useLanguage();
  const [output, setOutput] = useState(text);
  const [busy, setBusy] = useState(false);
  const cacheRef = useRef<string | null>(null);

  useEffect(() => {
    setOutput(text);
  }, [text]);

  useEffect(() => {
    if (lang === "el") {
      setOutput(text);
      return;
    }
    if (!text) return;

    // Check module-level cache
    const cacheKey = text;
    if (translationCache.has(cacheKey)) {
      setOutput(translationCache.get(cacheKey)!);
      return;
    }
    if (cacheRef.current) {
      setOutput(cacheRef.current);
      return;
    }

    let cancelled = false;
    setBusy(true);
    fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then(({ translation }) => {
        if (cancelled) return;
        translationCache.set(cacheKey, translation);
        cacheRef.current = translation;
        setOutput(translation);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setBusy(false); });

    return () => { cancelled = true; };
  }, [lang, text]);

  return { text: output, busy };
}
