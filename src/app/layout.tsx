import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers/providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FilCycle — Recycle Smart. Earn Rewards. Protect Tomorrow.",
  description:
    "Filamer Christian University plastic recycling management system with reward-based incentives. Recycle bottles, earn points, claim rewards.",
  keywords: ["recycling", "vending machine", "rewards", "sustainability", "university"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("filcycle-theme");document.documentElement.classList.toggle("dark",t!=="light");document.documentElement.classList.toggle("light",t==="light");}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
