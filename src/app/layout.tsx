import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@/styles/win98-theme.css";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import Header from "@/components/Header";
import AuthProvider from "@/context/AuthProvider";
import { Win98ThemeProvider, ThemeBridge } from "@/context/ThemeContext";
import { Win98Taskbar } from "@/components/Win98Taskbar";
import { Win98Shell } from "@/components/Win98Shell";

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
  icons: "/favicon.ico",
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
        <Script
          id="nostocode-theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('nostocode-theme')||'win98';if(t==='win98'){document.documentElement.setAttribute('data-win98','true');document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
        <Win98ThemeProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ThemeBridge />
            <AuthProvider>
              <Win98Shell>
                <Header />
                {children}
              </Win98Shell>
              <Toaster position="bottom-right" richColors />
              <Win98Taskbar />
            </AuthProvider>
          </ThemeProvider>
        </Win98ThemeProvider>
      </body>
    </html>
  );
}