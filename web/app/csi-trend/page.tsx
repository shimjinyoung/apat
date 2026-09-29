import { loadHistory } from "@/lib/raw-readings";
import { CsiTrendChart } from "@/components/CsiTrendChart";
import { HousingSentimentChart } from "@/components/HousingSentimentChart";

export default function CsiTrendPage() {
  const history = loadHistory();
  const seoul = history?.csi_housing_seoul ?? [];
  const gyeonggi = history?.csi_housing_gyeonggi ?? [];
  const incheon = history?.csi_housing_incheon ?? [];
  const hasCsiData = seoul.length > 0 || gyeonggi.length > 0 || incheon.length > 0;

  const sentimentNational = history?.housing_sentiment_national ?? [];
  const sentimentCapital = history?.housing_sentiment_capital ?? [];
  const hasSentimentData = sentimentNational.length > 0 || sentimentCapital.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">주택구입 심리 분석</h1>
        <p className="mt-2 text-sm text-neutral-600">
          집을 사려는 사람들의 심리를 두 기관의 공식 지표로 함께 보여줍니다. 둘 다 매수신호지수
          스코어링과는 무관한 참고용 화면입니다.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-800">수도권 주택가격전망 CSI</h2>
          <p className="mt-1 text-sm text-neutral-600">
            한국은행 소비자동향조사의 주택가격전망CSI(100 기준선, 위=상승 전망 우세)를 서울·경기·인천
            3개 지역으로 매달 자동 갱신해 보여줍니다. 한국은행은 이 셋을 합친 &quot;수도권&quot; 단일
            공식 수치를 발표하지 않아 3개 선을 함께 표시합니다.
          </p>
        </div>

        {hasCsiData ? (
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
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-800">주택시장 소비심리지수</h2>
          <p className="mt-1 text-sm text-neutral-600">
            국토연구원 부동산시장 소비자심리조사의 주택시장소비심리지수(100 기준선, 위=가격상승·거래증가
            응답 우세)입니다. 이 지수는 &quot;수도권&quot;(서울+인천+경기)을 하나로 묶은 공식 수치를
            직접 발표해, 위 CSI와 달리 전국·수도권 2개 선으로 바로 비교할 수 있습니다.
          </p>
        </div>

        {hasSentimentData ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
            <HousingSentimentChart national={sentimentNational} capital={sentimentCapital} />
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-400">
            아직 데이터가 없습니다. 파이프라인을 한 번 실행해주세요.
          </p>
        )}

        <p className="text-xs text-neutral-400">
          출처: KOSIS 국가통계포털 경유 국토연구원 「부동산시장 소비자심리조사」(통계표
          DT_39002_02, 주택시장 소비심리지수). 매일 08:00 자동 배치로 최신월 값을 갱신합니다(발표
          시차 고려해 최근 6개월 조회 후 최신값 반영).
        </p>
      </section>
    </div>
  );
}
