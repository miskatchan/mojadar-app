import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import ClientHeader from "@/components/ClientHeader";
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
  title: "HisabGuru - AI Financial Assistant",
  description: "Smart budgeting, fraud detection, and AI-powered financial insights for Bangladesh",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 min-h-screen`}
      >
        <div className="mx-auto min-h-screen max-w-md md:max-w-lg relative">
          <ClientHeader />
          <main className="pb-24 px-4 pt-2">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
