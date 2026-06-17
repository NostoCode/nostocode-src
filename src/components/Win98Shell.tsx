"use client";

import { useAppTheme } from "@/context/ThemeContext";
import Image from "next/image";

export function Win98Shell({ children }: { children: React.ReactNode }) {
  const { isWin98 } = useAppTheme();

  if (!isWin98) {
    return <>{children}</>;
  }

  return (
    <div className="win98-app-window">
      <div className="win98-chrome-titlebar" aria-hidden="true">
        <span className="win98-titlebar-text">
          <Image src="/favicon.ico" alt="" width={16} height={16} className="win98-titlebar-icon" />
          NostoCode
        </span>
        <div className="win98-window-controls">
          <button className="no-win98 win98-chrome-btn" tabIndex={-1}>
            _
          </button>
          <button className="no-win98 win98-chrome-btn" tabIndex={-1}>
            □
          </button>
          <button className="no-win98 win98-chrome-btn" tabIndex={-1}>
            ✕
          </button>
        </div>
      </div>
      <div className="win98-menubar" aria-label="Menu bar">
        <span className="win98-menubar-item">File</span>
        <span className="win98-menubar-item">Edit</span>
        <span className="win98-menubar-item">View</span>
        <span className="win98-menubar-item">Help</span>
      </div>
      {children}
    </div>
  );
}