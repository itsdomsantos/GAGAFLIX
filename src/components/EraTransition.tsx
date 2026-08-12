"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { registerEraTransition } from "@/lib/eraTransition";

/**
 * Transição de era por TIRAS verticais na cor da era.
 *
 * Ao clicar num círculo do carrossel, várias tiras varrem o ecrã — as pares
 * descem do topo, as ímpares sobem de baixo — em cascata, até cobrir tudo.
 * Aí navegamos para a página da era e, logo depois, as tiras recolhem (o mesmo
 * gesto ao contrário) revelando a nova página.
 *
 * A sequência é orquestrada por TEMPORIZADORES (não depende de detetar o fim da
 * navegação): mesmo que a navegação encrave, o véu desaparece sempre — nunca
 * fica preso a cobrir o site.
 */
const COUNT = 9; // nº de tiras
const STAGGER = 34; // ms de atraso entre tiras (cascata)
const DURATION = 360; // ms de cada tira
const HOLD = 260; // ms coberto antes de revelar (deixa a nova página pintar)
const EASE = "cubic-bezier(0.7, 0, 0.3, 1)";

const COVER_TOTAL = (COUNT - 1) * STAGGER + DURATION;

/** Posição fora-de-ecrã de cada tira: pares em cima, ímpares em baixo. */
const offscreen = (i: number) =>
  i % 2 === 0 ? "translateY(-101%)" : "translateY(101%)";

export default function EraTransition() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const unregister = registerEraTransition(({ color, href }) => {
      const container = containerRef.current;
      const els = stripRefs.current.filter(Boolean) as HTMLDivElement[];
      if (!container || els.length === 0) {
        router.push(href);
        return;
      }

      // Recomeça do zero se já houver uma transição a decorrer.
      clearTimers();
      els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));

      // A cor pinta as TIRAS. O fundo fica transparente durante o "cobrir"
      // para se verem as tiras a entrar sobre a página.
      container.style.setProperty("--era-veil", color);
      container.style.background = "transparent";
      container.style.pointerEvents = "auto";

      const animate = (reverse: boolean) =>
        els.forEach((el, i) => {
          const from = reverse ? "translateY(0)" : offscreen(i);
          const to = reverse ? offscreen(i) : "translateY(0)";
          const delay = (reverse ? els.length - 1 - i : i) * STAGGER;
          el.animate(
            [{ transform: from }, { transform: to }],
            { duration: DURATION, delay, easing: EASE, fill: "forwards" },
          );
        });

      // Fase 1 — cobrir.
      animate(false);

      // Fase 2 — já coberto: pinta o fundo (véu cheio, sem falhas) e navega.
      timers.current.push(
        setTimeout(() => {
          container.style.background = color;
          router.push(href);
        }, COVER_TOTAL),
      );

      // Fase 3 — revelar (o fundo deixa de cobrir; as tiras recolhem).
      timers.current.push(
        setTimeout(() => {
          container.style.background = "transparent";
          animate(true);
        }, COVER_TOTAL + HOLD),
      );

      // Fase 4 — limpar quando as tiras já saíram de cena.
      timers.current.push(
        setTimeout(
          () => {
            container.style.pointerEvents = "none";
            els.forEach((el) => el.getAnimations().forEach((a) => a.cancel()));
          },
          COVER_TOTAL + HOLD + COVER_TOTAL,
        ),
      );
    });

    return () => {
      unregister();
      clearTimers();
    };
  }, [router]);

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
