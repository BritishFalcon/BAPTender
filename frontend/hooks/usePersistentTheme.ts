import { useEffect, useState } from "react";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

export default function usePersistentTheme(
  themes: string[],
  storageKey = "themeIndex",
) {
  const [index, setIndex] = useState<number>(() => {
    if (typeof document !== "undefined") {
      const cookieVal = getCookie(storageKey);
      const stored = cookieVal ?? localStorage.getItem(storageKey);
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
    if (typeof document !== "undefined") {
      localStorage.setItem(storageKey, index.toString());
      setCookie(storageKey, index.toString());
      document.documentElement.className = themes[index];
    }
  }, [index, themes, storageKey]);

  const toggleTheme = () => setIndex((prev) => (prev + 1) % themes.length);

  return { currentThemeIndex: index, currentTheme: themes[index], toggleTheme };
}
