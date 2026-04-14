"use client";
import React from "react";
import { useWin98Theme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, toggleTheme } = useWin98Theme();

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="sm"
      className="cursor-pointer text-xs font-mono win98-theme-toggle"
      title={theme === "win98" ? "Switch to Modern theme" : "Switch to Win98 theme"}
    >
      {theme === "win98" ? "🖥 Modern" : "💾 Win98"}
    </Button>
  );
}
