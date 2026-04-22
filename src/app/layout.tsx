import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/win98-theme.css";

import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import AuthProvider from "@/context/AuthProvider";
import { Win98ThemeProvider } from "@/context/ThemeContext";
import { Win98Taskbar } from "@/components/Win98Taskbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NostoCode",
  description: "Ancient Coding Mode — A coding platform where cheating is impossible.",
  icons: "/favicon.ico"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* No-flash script: sets data-win98 before CSS paints */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('nostocode-theme')||'win98';if(t==='win98'){document.documentElement.setAttribute('data-win98','true');document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();` }} />
        <Win98ThemeProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            <AuthProvider>
              {/* win98-app-window: display:contents in modern, window frame in win98 */}
              <div className="win98-app-window">
                {/* Chrome title bar — hidden in modern mode via CSS */}
                <div className="win98-chrome-titlebar" aria-hidden="true">
                  <span className="win98-titlebar-text">
                    <img src="/favicon.ico" alt="" className="win98-titlebar-icon" />
                    NostoCode
                  </span>
                  <div className="win98-window-controls">
                    <button className="no-win98 win98-chrome-btn" tabIndex={-1}>_</button>
                    <button className="no-win98 win98-chrome-btn" tabIndex={-1}>□</button>
                    <button className="no-win98 win98-chrome-btn" tabIndex={-1}>✕</button>
                  </div>
                </div>
                <Header />
                {children}
              </div>
              <Toaster position="bottom-right" richColors />
              <Win98Taskbar />
            </AuthProvider>
          </ThemeProvider>
        </Win98ThemeProvider>
      </body>
    </html>
  );
}
