import { NextRequest, NextResponse } from "next/server";
import { searchApartmentTrades } from "@/lib/server/apartment-search";

// force-dynamic 유지: 검색어별로 쿼리 파라미터가 매번 다르므로 정적 캐싱 대상이 아니다.
// (각 월별 국토부 API 응답 자체는 fetch의 revalidate로 캐싱됨 — lib/server/apartment-search.ts 참고)
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";

  const result = await searchApartmentTrades(region, name);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
