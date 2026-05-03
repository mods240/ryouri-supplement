import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI健康料理提案 | 料理はこころのサプリ",
  description: "体調・気分・食材から、あなたに必要な栄養素とレシピをAIが提案します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0822883607725147"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}