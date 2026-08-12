"use client";

import Link from "next/link";
import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { playEraTransition } from "@/lib/eraTransition";

/**
 * Link de era com transição de página por expansão circular na cor da era.
 * Usado só pelo carrossel da homepage. Em qualquer situação que não deva
 * animar (browser sem suporte, reduced-motion, clique com modificadores, ou
 * um drag do carrossel que já cancelou o clique), deixa a navegação normal
 * seguir o seu curso.
 */
export default function EraLink({
  href,
  color,
  children,
  className,
  style,
  ariaLabel,
}: {
  href: string;
  color: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
}) {
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    // Novo separador / clique do meio / modificadores → deixa o browser tratar.
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    // Acessibilidade: sem animação para quem prefere menos movimento.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const played = playEraTransition({ x: e.clientX, y: e.clientY, color, href });
    if (played) e.preventDefault();
  }

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={style}
    >
      {children}
    </Link>
  );
}
