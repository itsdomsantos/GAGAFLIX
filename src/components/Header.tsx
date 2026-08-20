"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const links = [
  { key: "home", href: "/", label: "Home" },
  { key: "eras", href: "/eras", label: "Eras" },
  { key: "tours", href: "/tours", label: "Tours" },
  { key: "timeline", href: "/timeline", label: "Timeline" },
  { key: "news", href: "/news", label: "News" },
];

export default function Header({ hidden = [] }: { hidden?: string[] }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const visible = links.filter((l) => !hidden.includes(l.key));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/admin")) return null;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-bg/70 backdrop-blur-xl shadow-[0_1px_0_0_var(--era)]"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-4 sm:px-6">
        <Link href="/" className="font-display text-3xl tracking-wide chrome-text">
          GAGAFLIX
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          {visible.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`transition-colors hover:text-text ${
                pathname === l.href ? "text-text" : "text-muted"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <Link
            href="/search"
            aria-label="Search (press /)"
            className="rounded-full p-2 text-muted transition-colors hover:text-text"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}
