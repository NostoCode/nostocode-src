"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

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
  } else {
    document.documentElement.removeAttribute("data-win98");
  }
}

export function Win98ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
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
