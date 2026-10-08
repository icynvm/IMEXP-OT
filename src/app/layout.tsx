import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const thaiFont = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
});

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.webp',
  },
  title: { default: "ระบบขอ OT", template: "%s | ระบบขอ OT" },
  description: "ระบบขอทำ OT และใช้ชั่วโมง OT สะสม",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={`${thaiFont.variable} h-full`}>
      <body className="min-h-full bg-gray-50 font-sans text-gray-900 antialiased">{children}</body>
    </html>
  );
}
