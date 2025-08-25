import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Estait - AI Voice Assistant for Real Estate Agents",
  description: "Your MLS & CRM, one voice command away. Built for real estate agents on the go.",
  keywords: "real estate, CRM, MLS, voice assistant, AI, property search",
  authors: [{ name: "Estait" }],
  openGraph: {
    title: "Estait - AI Voice Assistant for Real Estate",
    description: "Your MLS & CRM, one voice command away",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
