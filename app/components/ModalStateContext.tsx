"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const ModalStateContext = createContext<{
  isAnyModalOpen: boolean;
  setModalOpen: (id: string, open: boolean) => void;
}>({ isAnyModalOpen: false, setModalOpen: () => {} });

export function ModalStateProvider({ children }: { children: React.ReactNode }) {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set());

  const setModalOpen = useCallback((id: string, open: boolean) => {
    setOpenModals((prev) => {
      if (open === prev.has(id)) return prev;
      const next = new Set(prev);
      if (open) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  return (
    <ModalStateContext.Provider value={{ isAnyModalOpen: openModals.size > 0, setModalOpen }}>
      {children}
    </ModalStateContext.Provider>
  );
}

export const useModalState = () => useContext(ModalStateContext);

// Any modal calls this with a stable id and its own open/closed boolean to
// register itself with the global "is any modal open" signal.
export function useRegisterModalOpen(id: string, isOpen: boolean) {
  const { setModalOpen } = useModalState();
  useEffect(() => {
    setModalOpen(id, isOpen);
    return () => setModalOpen(id, false);
  }, [id, isOpen, setModalOpen]);
}
