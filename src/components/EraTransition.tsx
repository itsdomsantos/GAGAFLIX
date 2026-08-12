"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { registerEraTransition } from "@/lib/eraTransition";

/**
 * Transição de era por TIRAS verticais na cor da era.
 *
 * Ao clicar num círculo do carrossel, várias tiras varrem o ecrã — as pares
 * descem do topo, as ímpares sobem de baixo — em cascata, até cobrir tudo.
 * Aí navegamos para a página da era e, quando ela está montada, as tiras
 * recolhem (o mesmo gesto ao contrário) revelando a nova página.
 *
 * O overlay vive no layout raiz, por isso sobrevive à navegação SPA — é o que
 * permite o gesto contínuo cobrir → revelar ("ida e volta").
 */
const COUNT = 9; // nº de tiras
const STAGGER = 40; // ms de atraso entre tiras (cascata)
const DURATION = 380; // ms de cada tira
const EASE = "cubic-bezier(0.7, 0, 0.3, 1)";

/** Posição fora-de-ecrã de cada tira: pares em cima, ímpares em baixo. */
const offscreen = (i: number) => (i % 2 === 0 ? "-101%" : "101%");

export default function EraTransition() {
  const router = useRouter();
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);

  const covering = useRef(false);
  const targetPath = useRef<string | null>(null);
  const safety = useRef<ReturnType<typeof setTimeout> | null>(null);

  const strips = () =>
    stripRefs.current.filter(Boolean) as HTMLDivElement[];

  /** Fase 2: recolhe as tiras, revelando a nova página. */
  const reveal = useCallback(() => {
    covering.current = false;
    targetPath.current = null;
    if (safety.current) {
      clearTimeout(safety.current);
      safety.current = null;
    }
    const container = containerRef.current;
    if (!container) return;
    const els = strips();

    // Pequena pausa para a nova página pintar por baixo antes de descobrir.
    setTimeout(() => {
      // O fundo do container deixa de cobrir — as tiras é que revelam.
      container.style.background = "transparent";
      const anims = els.map((el, i) =>
        el.animate(
          [{ transform: "translateY(0)" }, { transform: offscreen(i) }],
          {
            duration: DURATION,
            delay: (els.length - 1 - i) * STAGGER,
            easing: EASE,
            fill: "forwards",
          },
        ),
      );
      Promise.all(anims.map((a) => a.finished))
        .then(() => {
          container.style.pointerEvents = "none";
          els.forEach((el) => {
            el.getAnimations().forEach((a) => a.cancel());
          });
        })
        .catch(() => {});
    }, 80);
  }, []);

  // Fase 1: regista o disparador (cobrir com as tiras).
  useEffect(() => {
    return registerEraTransition(({ color, href }) => {
      const container = containerRef.current;
      if (!container) {
        router.push(href);
        return;
      }
      const els = strips();

      // A cor pinta as tiras e o fundo (esconde costuras enquanto cobre).
      container.style.setProperty("--era-veil", color);
      container.style.background = color;
      container.style.pointerEvents = "auto";

      covering.current = true;
      targetPath.current = href;

      els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
      const anims = els.map((el, i) =>
        el.animate(
          [{ transform: offscreen(i) }, { transform: "translateY(0)" }],
          { duration: DURATION, delay: i * STAGGER, easing: EASE, fill: "forwards" },
        ),
      );
      Promise.all(anims.map((a) => a.finished))
        .then(() => {
          router.push(href);
          // Rede de segurança: se a navegação encravar, revela na mesma.
          safety.current = setTimeout(() => {
            if (covering.current) reveal();
          }, 3500);
        })
        .catch(() => {});
    });
  }, [router, reveal]);

  // Fase 2: quando chegamos ao destino, revela.
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
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] flex"
    >
      {Array.from({ length: COUNT }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            stripRefs.current[i] = el;
          }}
          className="h-full flex-1"
          style={{
            background: "var(--era-veil, transparent)",
            transform: offscreen(i),
          }}
        />
      ))}
    </div>
  );
}
