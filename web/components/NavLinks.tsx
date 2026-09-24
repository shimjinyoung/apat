"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "대시보드" },
  { href: "/guide", label: "해석 방식 안내" },
  { href: "/manual-entry", label: "수동 입력 관리" },
  { href: "/national-price", label: "전국 실거래가 추이" },
  { href: "/apartment-search", label: "아파트 실거래가 검색" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 text-sm text-neutral-600">
      {LINKS.map((link) => {
        const isActive = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "font-semibold text-indigo-700 underline decoration-2 underline-offset-4"
                : "hover:text-neutral-900"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
