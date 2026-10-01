import { loadHistory } from "@/lib/raw-readings";
import { CsiTrendChart } from "@/components/CsiTrendChart";
import { HousingSentimentChart } from "@/components/HousingSentimentChart";
import { KhaiTrendChart } from "@/components/KhaiTrendChart";

export default function CsiTrendPage() {
  const history = loadHistory();
  const seoul = history?.csi_housing_seoul ?? [];
  const gyeonggi = history?.csi_housing_gyeonggi ?? [];
  const incheon = history?.csi_housing_incheon ?? [];
  const hasCsiData = seoul.length > 0 || gyeonggi.length > 0 || incheon.length > 0;

  const sentimentNational = history?.housing_sentiment_national ?? [];
  const sentimentCapital = history?.housing_sentiment_capital ?? [];
  const hasSentimentData = sentimentNational.length > 0 || sentimentCapital.length > 0;

  const khaiSeoul = history?.khai_seoul ?? [];
  const khaiGyeonggi = history?.khai_gyeonggi ?? [];
  const khaiIncheon = history?.khai_incheon ?? [];
  const hasKhaiData = khaiSeoul.length > 0 || khaiGyeonggi.length > 0 || khaiIncheon.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-xl font-semibold">주택구입 심리 분석</h1>
        <p className="mt-2 text-sm text-neutral-600">
          집을 사려는 사람들의 심리를 두 기관의 공식 지표로 함께 보여줍니다. 둘 다 매수신호지수
          스코어링과는 무관한 참고용 화면입니다.
        </p>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>주택가격전망 CSI</strong>: 설문 자체가 &quot;1년 후&quot;를 묻는 구조라
            설계상 <strong>선행(전망)</strong> 성격이 맞습니다. 다만 실제로는 응답자들이 최근
            가격 흐름을 그대로 연장해서 답하는 경향(적응적 기대)이 있어, 선행성이 이론만큼
            깨끗하게 나타나진 않습니다 — 두 지수가 거의 동시에 같이 움직이는 구간이 많은 것도
            이 때문입니다.
          </li>
          <li>
            <strong>주택시장 소비심리지수</strong>: &quot;후행&quot;보다는 <strong>동행(coincident)</strong>{" "}
            지표로 보는 게 더 정확합니다. 이미 확정된 과거 추세를 뒤늦게 확인해주는 지표(예:
            실업률 같은 전형적 후행지표)가 아니라, 중개업소·소비자가 <strong>지금 이 순간</strong>{" "}
            체감하는 거래·가격 분위기를 반영하는 거라 &quot;현재 상황&quot;에 더 가깝습니다.
          </li>
        </ul>
        <p className="mt-3">
          정리하면 &quot;CSI=선행, 소비심리지수=후행&quot;보다는{" "}
          <strong className="text-amber-700">
            &quot;CSI=선행(전망 기반, 단 연장 편향 있음), 소비심리지수=동행(현재 체감 기반)&quot;
          </strong>
          이 더 정확한 해석입니다.
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

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <p>
            한국은행이 소비자에게 <strong>&quot;앞으로 1년 뒤 주택가격이 지금보다 오를 것 같은가?&quot;</strong>를
            조사해 지수화한 것입니다. 기준은 100입니다.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            <li>
              <strong>100 초과</strong>: 1년 뒤 주택가격이 상승할 것이라는 응답이 우세
            </li>
            <li>
              <strong>100</strong>: 상승·하락 전망이 대체로 균형
            </li>
            <li>
              <strong>100 미만</strong>: 하락할 것이라는 응답이 우세
            </li>
          </ul>
          <p className="mt-3 font-medium text-amber-700">
            예를 들어 CSI가 120이라면 주택가격이 20% 오른다는 뜻이 아니라, 상승을 예상하는
            소비자가 하락을 예상하는 소비자보다 상당히 많다는 의미입니다.
          </p>
          <p className="mt-3">
            또한 실제 집값을 예측하는 지표라기보다는 <strong>시장 참여자의 심리를 보여주는 선행성
            지표</strong>로 보는 것이 적절합니다. 금리, 대출규제, 정부 부동산 정책, 최근 아파트
            가격 상승·하락 등의 영향을 많이 받습니다.
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

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <p>
            주택 매매·전세시장에 대한 <strong>소비자·중개업소의 체감 심리</strong>를 수치화한 지표로,
            한국은행 주택가격전망CSI와는 다른 지표입니다. 100을 기준으로 높을수록 심리가 강하고
            낮을수록 약하며, 국토연구원은 아래 3구간으로 나눠 해석합니다.
          </p>
          <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left">
                <tr>
                  <th className="px-3 py-1.5">지수</th>
                  <th className="px-3 py-1.5">의미</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">115 이상</td>
                  <td className="px-3 py-1.5">상승 국면</td>
                </tr>
                <tr className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">95 ~ 115 미만</td>
                  <td className="px-3 py-1.5">보합 국면</td>
                </tr>
                <tr className="border-t border-neutral-100">
                  <td className="px-3 py-1.5">95 미만</td>
                  <td className="px-3 py-1.5">하강 국면</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 font-medium text-amber-700">
            예를 들어 지수 125는 가격이 25% 오른다는 뜻이 아니라, 매수·거래·가격에 대한 시장
            참여자들의 체감이 강한 &quot;상승 국면&quot;이라는 의미입니다.
          </p>
          <p className="mt-3">
            <strong>CSI와의 차이</strong> — 한국은행 주택가격전망CSI는 일반 소비자에게 &quot;1년 후
            집값이 어떻게 될 것인가&quot;를 묻는 <strong>미래 전망</strong> 성격이 강한 반면, 이
            지수는 일반가구뿐 아니라 중개업소의 현장 체감까지 반영해 <strong>현재</strong> 주택시장
            심리를 파악하는 성격이 강합니다.
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

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-800">주택구입부담지수(K-HAI)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            한국주택금융공사 HOUSTAT의 주택구입부담지수(100 기준선, 위=대출상환 부담 큼)를
            서울·경기·인천 3개 지역으로 분기마다 자동 갱신해 보여줍니다. 위 두 지표와 달리 CSI·
            소비심리지수가 아니라 <strong>실제 소득·대출금리·주택가격으로 계산되는 산식 지표</strong>라,
            심리가 아닌 객관적인 구입 부담 수준을 보여줍니다.
          </p>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          <p>
            한국주택금융공사가 <strong>중위소득가구가 표준대출로 중위가격 주택을 구입할 때의
            대출상환 부담</strong>을 지수화한 것입니다. 산출식은 K-HAI = 대출상환가능소득 ÷
            중위가구소득 × 100이며, CSI·소비심리지수와 달리{" "}
            <strong className="text-amber-700">
              100을 기준으로 낮을수록 구입 부담이 적고(좋음), 높을수록 부담이 큽니다(나쁨) — 방향이
              반대인 지표
            </strong>
            입니다.
          </p>
          <p className="mt-3">
            예를 들어 서울 K-HAI가 185라면, 서울의 중위소득 가구가 서울 중위가격 주택을 살 때
            적정부담액(소득의 약 25%)의 185%를 대출 원리금 상환에 써야 한다는 뜻입니다 — 숫자가
            클수록 그만큼 내 집 마련이 버겁다는 의미입니다.
          </p>
          <p className="mt-3">
            &quot;수도권&quot; 단일 공식 수치는 역시 없습니다 — 한국주택금융공사도 17개 광역지자체를
            개별적으로만 제공해 서울·경기·인천을 나란히 표시합니다.
          </p>
        </div>

        {hasKhaiData ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
            <KhaiTrendChart seoul={khaiSeoul} gyeonggi={khaiGyeonggi} incheon={khaiIncheon} />
          </div>
        ) : (
          <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-400">
            아직 데이터가 없습니다. 파이프라인을 한 번 실행해주세요.
          </p>
        )}

        <p className="text-xs text-neutral-400">
          출처: 한국주택금융공사 HOUSTAT(주택금융통계시스템) 주택구입부담지수(통계표ID
          T186503126543136). 분기 단위 발표. 매일 08:00 자동 배치로 최신 분기 값을
          갱신합니다(발표 시차 고려해 최근 3개 분기 조회 후 최신값 반영).
        </p>
      </section>
    </div>
  );
}
