"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

// A "hide the Tonight FAB" signal, kept apart from ModalStateContext on
// purpose: isAnyModalOpen also hides the Nightwaves strip on mobile, and
// overlays like the navbar menu or the auth modal should only take the FAB
// out of the way, not the radio. Only TonightFAB reads this.
const TonightFabVisibilityContext = createContext<{
  isFabHidden: boolean;
  setFabHidden: (id: string, hidden: boolean) => void;
}>({ isFabHidden: false, setFabHidden: () => {} });

export function TonightFabVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hiders, setHiders] = useState<Set<string>>(new Set());

  const setFabHidden = useCallback((id: string, hidden: boolean) => {
    setHiders((prev) => {
      if (hidden === prev.has(id)) return prev;
      const next = new Set(prev);
      if (hidden) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  return (
    <TonightFabVisibilityContext.Provider value={{ isFabHidden: hiders.size > 0, setFabHidden }}>
      {children}
    </TonightFabVisibilityContext.Provider>
  );
}

export const useIsTonightFabHidden = () => useContext(TonightFabVisibilityContext).isFabHidden;

// Any overlay calls this with a stable id and its own open/closed boolean;
// the FAB stays hidden while at least one id is active.
export function useHideTonightFab(id: string, isOpen: boolean) {
  const { setFabHidden } = useContext(TonightFabVisibilityContext);
  useEffect(() => {
    setFabHidden(id, isOpen);
    return () => setFabHidden(id, false);
  }, [id, isOpen, setFabHidden]);
}
