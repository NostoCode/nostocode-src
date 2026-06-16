"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme } from "next-themes";

export type Win98Theme = "win98" | "modern";

interface Win98ThemeContextValue {
  theme: Win98Theme;
  toggleTheme: () => void;
}

const Win98ThemeContext = createContext<Win98ThemeContextValue>({
  theme: "win98",
  toggleTheme: () => {},
});

function applyTheme(t: Win98Theme) {
  if (t === "win98") {
    document.documentElement.setAttribute("data-win98", "true");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.removeAttribute("data-win98");
    document.documentElement.classList.remove("light");
    const prefersDark =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }
}

export function Win98ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Win98Theme>("win98");

  useEffect(() => {
    const stored = localStorage.getItem("nostocode-theme");
    const initial: Win98Theme = stored === "modern" ? "modern" : "win98";
    setThemeState(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: Win98Theme = theme === "win98" ? "modern" : "win98";
    setThemeState(next);
    localStorage.setItem("nostocode-theme", next);
    applyTheme(next);
  };

  return (
    <Win98ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </Win98ThemeContext.Provider>
  );
}

export function useWin98Theme() {
  return useContext(Win98ThemeContext);
}

/** Single hook for color mode decisions across the app */
export function useAppTheme() {
  const { theme: mode, toggleTheme } = useWin98Theme();
  const { theme: rawTheme, setTheme } = useTheme();
  const isWin98 = mode === "win98";
  const colorMode: "light" | "dark" = isWin98
    ? "light"
    : rawTheme === "dark"
      ? "dark"
      : "light";

  return {
    mode,
    isWin98,
    colorMode,
    theme: colorMode,
    rawTheme,
    setTheme,
    toggleTheme,
  };
}

/** Keeps next-themes in sync when Ancient/Win98 mode forces light */
export function ThemeBridge() {
  const { isWin98 } = useAppTheme();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isWin98 && theme === "dark") {
      setTheme("light");
    }
  }, [isWin98, theme, setTheme]);

  return null;
}