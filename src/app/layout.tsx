// src/app/layout.tsx
import "@/styles/globals.css";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "개화 : 꽃이 아닌 당신의 이야기",
  description: "반응형 Next.js · Tailwind CSS 예제",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          font-junggo
          antialiased
          bg-gray-50
          text-gray-800
        `}
      >
        {/* 전역 네비게이션 */}
        <Navbar />

        {/* 페이지 컨텐츠 */}
        <main className="max-w-6xl mx-auto py-8">{children}</main>
      </body>
    </html>
  );
}
