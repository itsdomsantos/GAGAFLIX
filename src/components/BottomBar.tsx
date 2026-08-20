"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  {
    key: "home",
    href: "/",
    label: "Home",
    icon: (
      <path
        d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
    ),
  },
  {
    key: "eras",
    href: "/eras",
    label: "Eras",
    icon: (
      <>
        <rect x="3" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="13" y="4" width="8" height="8" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="3" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
        <rect x="13" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
  },
  {
    key: "tours",
    href: "/tours",
    label: "Tours",
    icon: (
      <>
        <path d="M4 20V9l8-5 8 5v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" fill="none" />
        <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M9 20v-3a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="2" fill="none" />
      </>
    ),
  },
  {
    key: "timeline",
    href: "/timeline",
    label: "Timeline",
    icon: (
      <>
        <path d="M12 3v18" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="7" r="2.5" fill="currentColor" />
        <circle cx="12" cy="16" r="2.5" fill="currentColor" />
      </>
    ),
  },
  {
    key: "news",
    href: "/news",
    label: "News",
    icon: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" fill="none" />
        <path d="M7 8h7M7 12h10M7 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
];

export default function BottomBar({ hidden = [] }: { hidden?: string[] }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const visible = items.filter((item) => !hidden.includes(item.key));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-bg/85 backdrop-blur-xl md:hidden">
      {visible.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
              active ? "text-era" : "text-muted"
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
