import { NextRequest, NextResponse } from "next/server";
import { searchApartmentTrades } from "@/lib/server/apartment-search";
import { isLocalExecAvailable } from "@/lib/deploy-env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isLocalExecAvailable) {
    return NextResponse.json({ ok: false, message: "이 기능은 로컬 환경에서만 사용할 수 있습니다." }, { status: 501 });
  }
  const region = req.nextUrl.searchParams.get("region") ?? "";
  const name = req.nextUrl.searchParams.get("name") ?? "";

  const result = await searchApartmentTrades(region, name);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
