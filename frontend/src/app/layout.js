import { Suspense } from "react";

import { Inter as FontSans } from "next/font/google"

import { APIProvider } from "@/components/apiProvider";
import { AuthProvider } from "@/components/authProvider";
import { ThemeProvider } from "@/components/themeProvider";
import BaseLayout from "@/components/layout/BaseLayout";
import { cn } from "@/lib/utils"

import "./globals.css";
 
const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata = {
  title: "DocAI - AI-Powered Document Editor",
  description: "DocAI is an AI-powered document editor that helps you create, collaborate, and bring your ideas to life with intelligent assistance.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}>
          <Suspense fallback={<div>Loading...</div>}>
          <ThemeProvider 
              attribute="class"
              defaultTheme="light"
          >
          <APIProvider>
          <AuthProvider>
            <BaseLayout className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col bg-muted/40">
                {children}
            </BaseLayout>
          </AuthProvider>
          </APIProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}