import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeSync } from "@/components/theme-toggle";

const interSans = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ASO Companion · American Space Oujda",
  description:
    "ASO Companion: weekly plans for every ELTASO level, clubs, events, the library and the reporting guide for American Space Oujda.",
  keywords: ["ASO", "American Space Oujda", "ELTASO", "English", "lesson plans", "clubs"],
  authors: [{ name: "American Space Oujda" }],
  openGraph: {
    title: "ASO Companion",
    description: "Weekly plans, clubs, events and resources for American Space Oujda.",
    siteName: "ASO Companion",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B5CE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${interSans.variable} ${mono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <ThemeSync />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
