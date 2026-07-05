"use client";

import { useEffect } from "react";

/** Camaleão: injeta a cor da era no --era global enquanto a página está montada. */
export default function EraTheme({ accent }: { accent: string }) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--era", accent);
    return () => {
      root.style.removeProperty("--era");
    };
  }, [accent]);

  return null;
}
