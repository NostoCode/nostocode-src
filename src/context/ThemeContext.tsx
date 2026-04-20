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
    // Force light mode in Ancient/Win98 theme (dark mode variables conflict)
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.removeAttribute("data-win98");
    // Remove the light class forced by win98 mode; restore user's dark preference
    document.documentElement.classList.remove("light");
    const prefersDark = localStorage.getItem("theme") === "dark"
      || (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (prefersDark) {
      document.documentElement.classList.add("dark");
    }
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

  // When in Win98/Ancient mode, prevent next-themes from adding the dark class
  useEffect(() => {
    if (theme !== "win98") return;
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains("dark")) {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [theme]);

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
