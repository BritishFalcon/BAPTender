import React, { createContext, useContext, useState } from "react";

export type PopupName = "account" | "groups" | "drink-edit" | null;

interface PopupContextType {
  activePopup: PopupName;
  setActivePopup: (name: PopupName) => void;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [activePopup, setActivePopup] = useState<PopupName>(null);

  return (
    <PopupContext.Provider value={{ activePopup, setActivePopup }}>
      {children}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const ctx = useContext(PopupContext);
  if (!ctx) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return ctx;
}
