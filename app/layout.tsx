import "./globals.css";
import type { Metadata } from "next";
import { Manrope, Bebas_Neue } from "next/font/google";
import Providers from "./providers";
import { Toaster } from "react-hot-toast";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-body" });
const bebas = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-display" });

export const metadata: Metadata = {
  title: "StreamForge",
  description: "Netflix-like streaming app built with Next.js"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${manrope.variable} ${bebas.variable}`}>
      <body className="min-h-screen font-sans">
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
