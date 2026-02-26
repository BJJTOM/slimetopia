import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlimeTopia - 슬라임토피아",
  description:
    "귀여운 슬라임을 수집하고, 합성하고, 육성하고, 나만의 마을을 꾸며보세요!",
  keywords: ["슬라임", "육성", "수집", "게임", "슬라임토피아", "SlimeTopia"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
