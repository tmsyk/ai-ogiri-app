import type { Metadata, Viewport } from "next";
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

// アプリ全体のメタデータ設定
export const metadata: Metadata = {
  title: "AI大喜利",
  description: "AIと対決！大喜利バトル",
  // ここでマニフェストとアイコンを読み込みます
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png", // iPhone/iPadのホーム画面用
  },
};

// ビューポート設定（Next.jsの推奨に従いmetadataとは別に定義）
export const viewport: Viewport = {
  // スマホのアドレスバーの色など
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // アプリっぽく操作できるように拡大縮小を無効化
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}