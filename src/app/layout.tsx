import type { Metadata } from "next";
import { Archivo, Metal_Mania } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import BottomBar from "@/components/BottomBar";
import KeyboardShortcuts from "@/components/KeyboardShortcuts";

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
    "Todo o universo Lady Gaga num só sítio: performances ao vivo, videoclipes, entrevistas e mais. By Little Monsters, to Little Monsters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt" className={`${archivo.variable} ${metalMania.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <KeyboardShortcuts />
        <Header />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-line px-6 py-8 text-center text-sm text-muted">
          <span className="font-display text-lg chrome-text align-middle mr-2">GAGAFLIX</span>
          by Little Monsters, to Little Monsters. Site de fãs — todos os vídeos são lidos das
          plataformas originais.
        </footer>
        <BottomBar />
      </body>
    </html>
  );
}
