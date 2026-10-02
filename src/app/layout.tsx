import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { env } from "@/lib/env";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Pulseboard — Simple, privacy-friendly web analytics",
    template: "%s | Pulseboard",
  },
  description:
    "Pulseboard is a lightweight, cookie-free web analytics platform. One script tag, a clear dashboard, no personal data.",
  openGraph: { type: "website", siteName: "Pulseboard" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
