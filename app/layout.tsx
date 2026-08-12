import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ai Bridge — Control Center",
  description: "Ai Bridge - Central IoT & AI Controller Center",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F3F4F6] text-[#111827] font-sans selection:bg-[#3B82F6]/20 selection:text-[#3B82F6]">
        {children}
      </body>
    </html>
  );
}
