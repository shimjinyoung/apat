import { loadHistory } from "@/lib/raw-readings";
import { CsiTrendChart } from "@/components/CsiTrendChart";

export default function CsiTrendPage() {
  const history = loadHistory();
  const seoul = history?.csi_housing_seoul ?? [];
  const gyeonggi = history?.csi_housing_gyeonggi ?? [];
  const incheon = history?.csi_housing_incheon ?? [];
  const hasData = seoul.length > 0 || gyeonggi.length > 0 || incheon.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">수도권 주택가격전망 CSI</h1>
        <p className="mt-2 text-sm text-neutral-600">
          한국은행 소비자동향조사의 주택가격전망CSI(100 기준선, 위=상승 전망 우세)를 서울·경기·인천
          3개 지역으로 매달 자동 갱신해 보여줍니다. 한국은행은 이 셋을 합친 &quot;수도권&quot; 단일
          공식 수치를 발표하지 않아 3개 선을 함께 표시합니다. 매수신호지수 스코어링과는 무관한
          참고용 화면입니다.
        </p>
      </div>

      {hasData ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
          <CsiTrendChart seoul={seoul} gyeonggi={gyeonggi} incheon={incheon} />
        </div>
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-400">
          아직 데이터가 없습니다. 파이프라인을 한 번 실행해주세요.
        </p>
      )}

      <p className="text-xs text-neutral-400">
        출처: 한국은행 ECOS 소비자동향조사 — 서울(511Y002, 전국 기준 표의 서울 항목),
        경기·인천(511Y004, 지역별 표). 두 표의 지역 구분 체계가 달라(511Y002에는 경기·인천이,
        511Y004에는 서울이 없음) 합산한 &quot;수도권&quot; 수치는 존재하지 않습니다. 매일 08:00
        자동 배치로 최신월 값을 갱신합니다(발표 시차 고려해 최근 6개월 조회 후 최신값 반영).
      </p>
    </div>
  );
}
