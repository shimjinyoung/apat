"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "대시보드" },
  { href: "/guide", label: "해석 방식 안내" },
  { href: "/manual-entry", label: "수동 입력 관리" },
  { href: "/national-price", label: "전국 실거래가 추이" },
  { href: "/apartment-search", label: "아파트 실거래가 검색" },
  { href: "/csi-trend", label: "수도권 주택가격전망 CSI" },
];

function isLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // 라우트가 바뀌면(링크 클릭 등) 모바일 드롭다운을 자동으로 닫는다
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="relative">
      {/* 데스크톱: 가로 나열. 좁은 화면에서는 줄바꿈으로 뭉개지므로 숨긴다 */}
      <nav className="hidden md:flex gap-4 text-sm text-neutral-600">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isLinkActive(pathname, link.href) ? "page" : undefined}
            className={
              isLinkActive(pathname, link.href)
                ? "font-semibold text-indigo-700 underline decoration-2 underline-offset-4"
                : "hover:text-neutral-900"
            }
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* 모바일: 햄버거 버튼 + 드롭다운 */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-label="메뉴 열기"
        className="flex md:hidden h-9 w-9 items-center justify-center rounded-md border border-neutral-200 text-neutral-600"
      >
        {isOpen ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {isOpen && (
        <nav className="absolute right-0 top-full z-20 mt-2 flex w-56 flex-col gap-1 rounded-lg border border-neutral-200 bg-white p-2 text-sm text-neutral-600 shadow-lg md:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isLinkActive(pathname, link.href) ? "page" : undefined}
              className={
                isLinkActive(pathname, link.href)
                  ? "rounded px-3 py-2 font-semibold text-indigo-700 bg-indigo-50"
                  : "rounded px-3 py-2 hover:bg-neutral-50 hover:text-neutral-900"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
