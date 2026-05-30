"use client";
import { createContext, useContext, useState } from "react";

const TonightContext = createContext<{
  isOpen: boolean;
  open: () => void;
  close: () => void;
}>({ isOpen: false, open: () => {}, close: () => {} });

export function TonightProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <TonightContext.Provider value={{ isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }}>
      {children}
    </TonightContext.Provider>
  );
}

export const useTonightModal = () => useContext(TonightContext);
