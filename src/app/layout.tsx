import type { Metadata, Viewport } from "next";
import { Archivo, Metal_Mania } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import InstallDock from "@/components/InstallDock";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";
import ChatBot from "@/components/ChatBot";
import EraTransition from "@/components/EraTransition";
import Analytics from "@/components/Analytics";
import MusicPlayer from "@/components/MusicPlayer";
import { getHiddenPages } from "@/lib/data";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const metalMania = Metal_Mania({
  variable: "--font-metal",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GAGAFLIX — The Ultimate Lady Gaga Experience",
  description:
    "The whole Lady Gaga universe in one place: live performances, music videos, interviews and more. By Little Monsters, to Little Monsters.",
  manifest: "/manifest.webmanifest",
  // Makes the iOS home-screen shortcut open full-screen and show just "GAGAFLIX".
  appleWebApp: {
    capable: true,
    title: "GAGAFLIX",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const hidden = await getHiddenPages();
  return (
    <html lang="en" className={`${archivo.variable} ${metalMania.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <KeyboardShortcuts />
        <Header hidden={hidden} />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-6 py-8 text-center text-sm text-muted">
          <span className="font-display text-lg chrome-text align-middle mr-2">GAGAFLIX</span>
          by Little Monsters, to Little Monsters. Every video plays from its
          original platform.
        </footer>
        <BottomBar hidden={hidden} />
        <InstallDock />
        <ChatBot />
        <MusicPlayer />
        <EraTransition />
        <Analytics />
      </body>
    </html>
  );
}
