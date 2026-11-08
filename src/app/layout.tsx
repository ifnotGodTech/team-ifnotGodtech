import type { Metadata } from "next";
import { Manrope, Public_Sans } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const publicSans = Public_Sans({ variable: "--font-public-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Team dashboard | IFNOTGOD TECH", template: "%s | IFNOTGOD TECH dashboard" },
  description: "The IFNOTGOD TECH team's internal dashboard.",
  // Internal only. next.config.ts also sends X-Robots-Tag, and robots.txt disallows everything.
  robots: { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${publicSans.variable} h-full antialiased`}>
      {/* Browser extensions such as ColorZilla add attributes to <body> before React loads.
          This ignores attribute differences on <body> only; mismatches inside the page still show. */}
      <body className="min-h-full" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
