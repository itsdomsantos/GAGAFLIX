"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Fila horizontal com drag do rato (com inércia) + setas de navegação.
 * Usado pelas rows de vídeos e pelo carrossel das eras.
 */
export default function Scroller({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, scrollLeft: 0, moved: 0 });
  const velocity = useRef(0);
  const lastMove = useRef({ x: 0, t: 0 });
  const raf = useRef<number | null>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [update]);

  function stopInertia() {
    if (raf.current) {
      cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType !== "mouse") return; // touch já faz scroll nativo
    const el = ref.current;
    if (!el) return;
    stopInertia();
    velocity.current = 0;
    lastMove.current = { x: e.clientX, t: performance.now() };
    drag.current = { down: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: 0 };
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.down) return;
    const el = ref.current;
    if (!el) return;
    const now = performance.now();
    const dt = now - lastMove.current.t;
    if (dt > 0) velocity.current = (e.clientX - lastMove.current.x) / dt; // px/ms
    lastMove.current = { x: e.clientX, t: now };

    const dx = e.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    if (drag.current.moved > 5) el.setPointerCapture?.(e.pointerId);
    el.scrollLeft = drag.current.scrollLeft - dx;
  }

  function endDrag() {
    if (!drag.current.down) return;
    drag.current.down = false;

    // Inércia: continua a deslizar e desacelera suavemente
    if (Math.abs(velocity.current) > 0.15) {
      const step = () => {
        const el = ref.current;
        if (!el) {
          raf.current = null;
          return;
        }
        el.scrollLeft -= velocity.current * 14;
        velocity.current *= 0.94;
        raf.current =
          Math.abs(velocity.current) > 0.04 ? requestAnimationFrame(step) : null;
      };
      raf.current = requestAnimationFrame(step);
    }
  }

  // Se arrastou, o "click" que se segue não deve abrir o link
  function onClickCapture(e: React.MouseEvent) {
    if (drag.current.moved > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
    drag.current.moved = 0;
  }

  function scrollByDir(dir: number) {
    const el = ref.current;
    if (!el) return;
    stopInertia();
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  }

  return (
    <div className="group/scroller relative">
      <div
        ref={ref}
        data-scroller
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className={`no-scrollbar cursor-grab select-none overflow-x-auto active:cursor-grabbing ${className ?? ""}`}
      >
        {children}
      </div>

      {canLeft && <Arrow dir={-1} onClick={() => scrollByDir(-1)} />}
      {canRight && <Arrow dir={1} onClick={() => scrollByDir(1)} />}
    </div>
  );
}

function Arrow({ dir, onClick }: { dir: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir < 0 ? "Scroll left" : "Scroll right"}
      className={`absolute top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-bg/70 text-text opacity-0 backdrop-blur transition-all hover:border-era hover:text-era group-hover/scroller:opacity-100 md:flex ${
        dir < 0 ? "left-2" : "right-2"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d={dir < 0 ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
