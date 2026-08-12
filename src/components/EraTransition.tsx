"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { registerEraTransition } from "@/lib/eraTransition";

/**
 * Overlay global da transição de era (Opção 1: expansão circular na cor da era).
 *
 * Fluxo:
 *  1. Clicas num círculo do carrossel → uma onda da cor da era nasce nesse
 *     ponto exato e expande-se até cobrir o ecrã.
 *  2. No fim da expansão, navegamos para a página da era (por baixo do véu).
 *  3. Quando a nova página está montada (pathname === destino), o véu
 *     desvanece e "assenta" no radial glow que a era-page já tem no topo.
 *
 * Vive no layout raiz, por isso sobrevive à navegação (SPA) — é o que permite
 * o gesto contínuo de cobrir-e-revelar ("ida e volta").
 */
export default function EraTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  const covering = useRef(false);
  const targetPath = useRef<string | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Fase 3: revela a nova página por baixo do véu. */
  const reveal = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    covering.current = false;
    targetPath.current = null;
    if (safety.current) {
      clearTimeout(safety.current);
      safety.current = null;
    }
    // Pequena pausa para a nova página pintar antes de descobrirmos.
    setTimeout(() => {
      const fade = el.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 440,
        easing: "ease-out",
        fill: "forwards",
      });
      fade.onfinish = () => {
        el.getAnimations().forEach((a) => a.cancel());
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
        el.style.clipPath = "circle(0px at 50% 50%)";
      };
    }, 80);
  }, []);

  // Regista o disparador da fase 1 (expansão).
  useEffect(() => {
    return registerEraTransition(({ x, y, color, href }) => {
      const el = ref.current;
      if (!el) {
        router.push(href);
        return;
      }
      // Raio necessário para chegar ao canto mais distante do ponto de clique.
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y),
      );

      el.getAnimations().forEach((a) => a.cancel());
      el.style.background = color;
      el.style.opacity = "1";
      el.style.pointerEvents = "auto";

      covering.current = true;
      targetPath.current = href;

      const expand = el.animate(
        [
          { clipPath: `circle(0px at ${x}px ${y}px)` },
          { clipPath: `circle(${Math.ceil(radius)}px at ${x}px ${y}px)` },
        ],
        { duration: 460, easing: "cubic-bezier(0.66, 0, 0.34, 1)", fill: "forwards" },
      );
      expand.onfinish = () => {
        router.push(href);
        // Rede de segurança: se a navegação encravar, revela na mesma.
        safety.current = setTimeout(() => {
          if (covering.current) reveal();
        }, 3500);
      };
    });
  }, [router, reveal]);

  // Fase 3: quando chegamos ao destino, revela.
  useEffect(() => {
    if (!covering.current) return;
    if (targetPath.current && pathname !== targetPath.current) return;
    reveal();
  }, [pathname, reveal]);

  useEffect(() => {
    return () => {
      if (safety.current) clearTimeout(safety.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] opacity-0"
      style={{ clipPath: "circle(0px at 50% 50%)" }}
    />
  );
}
