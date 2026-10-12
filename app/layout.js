import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import DemoNotice from "@/components/DemoNotice";
import { getCurrentUser } from "@/lib/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: "TravelShare",
    template: "%s | TravelShare",
  },
  description: "혼자, 친구, 연인, 가족과 함께하는 여행 코스와 기록을 공유하세요.",
};

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* 키보드 사용자가 메뉴를 건너뛰고 본문으로 바로 이동 */}
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
        >
          본문으로 건너뛰기
        </a>
        <DemoNotice />
        <Header user={user} />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 outline-none md:pb-12">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
