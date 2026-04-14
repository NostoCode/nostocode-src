"use client";
import React, { useEffect, useState } from "react";

export function Win98Taskbar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getHours().toString().padStart(2, "0");
      const m = now.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    updateClock();
    const id = setInterval(updateClock, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="win98-taskbar" role="toolbar" aria-label="Taskbar">
      <button className="win98-start-button no-win98">
        <span>🏁</span>
        <span>Start</span>
      </button>
      <div className="win98-taskbar-spacer" />
      <div className="win98-taskbar-clock" aria-label="System clock">
        {time || "00:00"}
      </div>
    </div>
  );
}
