import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nykaa Fashion Discovery Engine",
  description:
    "Public-web evidence engine for studying the Nykaa Fashion shopping journey, and a personalised Fit Check agent, for a 30-day wishlist purchase conversion project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <header className="border-b border-border">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
            <span className="text-xs font-semibold tracking-[0.2em] text-muted uppercase">
              Nykaa Fashion · Graduation Project
            </span>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/" className="text-foreground/90 transition hover:text-accent">
                Discovery Engine
              </Link>
              <Link
                href="/fit-check"
                className="text-foreground/90 transition hover:text-accent"
              >
                Fit Check
              </Link>
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
