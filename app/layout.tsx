import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const baseUrl = new URL(`${protocol}://${host}`);

  return {
    metadataBase: baseUrl,
    title: "Nirva Media — One idea. Every channel. Every language.",
    description: "สร้าง ปรับภาษา เผยแพร่ และวิเคราะห์คอนเทนต์ทุกช่องทางด้วย AI บนพื้นที่ทำงานเดียว",
    openGraph: {
      title: "Nirva Media",
      description: "หนึ่งไอเดีย ไปได้ทุกที่ — AI Content Operating System",
      type: "website",
      images: [{ url: "/og.png", width: 1732, height: 909, alt: "Nirva Media — One idea. Every channel. Every language." }],
    },
    twitter: { card: "summary_large_image", title: "Nirva Media", description: "หนึ่งไอเดีย ไปได้ทุกที่", images: ["/og.png"] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
