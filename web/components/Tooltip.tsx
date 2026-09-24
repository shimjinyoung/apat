"use client";

import { useRef, useState, type ReactNode } from "react";

const TOOLTIP_WIDTH = 260;
const GAP = 8;

/**
 * 브라우저 기본 title 속성 툴팁은 마우스 포인터 우하단에 뜨고 위치를 제어할 수 없다.
 * position:fixed로 뷰포트 기준 배치해 트리거 우상단에 띄운다.
 *
 * fixed를 쓰는 이유: 이 컴포넌트가 `overflow-x-auto` 테이블 컨테이너 안에서도 쓰이는데,
 * absolute로 하면 (1) 컨테이너가 overflow-x를 auto로 주면 overflow-y도 덩달아 잘려서
 * 툴팁 윗부분이 클리핑되고, (2) 툴팁이 열릴 때 그 너비만큼 컨테이너의 스크롤 영역이 늘어나
 * 불필요한 가로 스크롤바가 생긴다. fixed는 뷰포트 기준이라 두 문제 모두 피한다.
 */
export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  function show() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(rect.left, window.innerWidth - TOOLTIP_WIDTH - GAP);
    setPos({ top: rect.top - GAP, left: Math.max(GAP, left) });
  }

  function hide() {
    setPos(null);
  }

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {pos && (
        <span
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, transform: "translateY(-100%)", width: TOOLTIP_WIDTH }}
          className="pointer-events-none z-50 whitespace-pre-line rounded-md bg-neutral-800 px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
