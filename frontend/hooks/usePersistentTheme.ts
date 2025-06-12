import { useEffect, useState } from "react";

export default function usePersistentTheme(
  themes: string[],
  storageKey = "themeIndex",
) {
  const [index, setIndex] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < themes.length) {
          return parsed;
        }
      }
    }
    return 0;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, index.toString());
      document.documentElement.className = themes[index];
    }
  }, [index, themes, storageKey]);

  const toggleTheme = () => setIndex((prev) => (prev + 1) % themes.length);

  return { currentThemeIndex: index, currentTheme: themes[index], toggleTheme };
}
