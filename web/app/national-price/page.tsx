import { NationalPriceChart } from "@/components/NationalPriceChart";
import nationalIndexRaw from "@/data/national-price-index.json";

export default function NationalPricePage() {
  const hasData = Array.isArray(nationalIndexRaw) && nationalIndexRaw.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">전국 실거래가 추이</h1>
        <p className="mt-2 text-sm text-neutral-600">
          2006년 1월 부동산 실거래가 신고제 시행과 함께 통계 조사가 시작된 이래 지금까지의 전국 아파트 실거래가격지수
          월별 추이입니다. 아래 그래프의 주황 점은 시장의 방향이 크게 꺾인 9개 지점이며, 마우스를 올리면 당시 무슨
          일이 있었는지 보여줍니다. 서울 10개 지표 기반 매수신호지수 채점과는 무관한 참고용 화면입니다.
        </p>
      </div>

      {hasData ? (
        <NationalPriceChart />
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-400">
          아직 데이터가 없습니다. <code className="rounded bg-neutral-100 px-1">web/data/national-price-index.json</code>을
          확인해주세요.
        </p>
      )}

      <p className="text-xs text-neutral-400">
        출처: KOSIS 국가통계포털 경유 한국부동산원 「아파트 매매 실거래가격지수」(통계표 DT_KAB_11672_S1, 전국). 기준시점
        2026년 6월=100.0(2026년 9월 KOSIS가 2017년 11월=100.0에서 재설정). 변곡점 설명은 각 시점 전후 지수 변화와
        해당 시기의 공개된 정책·시장 사건(금융위기, 부동산 대책, 기준금리 조정 등)을 근거로 정리한 것으로, 개별 투자
        판단의 근거로 삼기보다는 흐름을 이해하는 참고 자료로 활용하시기 바랍니다.
      </p>
    </div>
  );
}
