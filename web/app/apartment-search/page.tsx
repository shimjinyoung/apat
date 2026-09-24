import { ApartmentSearchForm } from "@/components/ApartmentSearchForm";
import { isLocalExecAvailable } from "@/lib/deploy-env";

export default function ApartmentSearchPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">아파트 실거래가 검색</h1>
        <p className="mt-2 text-sm text-neutral-600">
          서울·경기 지역을 선택하고 아파트명을 입력하면 국토교통부 실거래가 공개시스템 기준 최근 3년(최대
          36개월)간의 개별 거래금액 추이를 보여줍니다. 매수신호지수 스코어링과는 무관한 조회 전용
          화면입니다.
        </p>
      </div>

      {isLocalExecAvailable ? (
        <>
          <div className="rounded-lg border border-neutral-200 bg-white p-4 sm:p-6">
            <ApartmentSearchForm />
          </div>
          <p className="text-xs text-neutral-400">
            출처: 국토교통부 실거래가 공개시스템 Open API(getRTMSDataSvcAptTradeDev). 지역+월 단위로만
            조회되는 API 특성상, 선택한 지역의 최근 36개월치 원자료를 조회한 뒤 아파트명이 일치하는
            거래만 걸러 보여줍니다. 같은 지역은 결과를 캐싱해 재조회 시 더 빠릅니다.
          </p>
        </>
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
          🔒 이 배포본에서는 검색할 수 없습니다 — 조회 시 로컬 Python 스크립트를 직접 실행하는
          방식이라 로컬 환경에서만 동작합니다. 로컬에서 실행 중인 앱에서 이용해주세요.
        </p>
      )}
    </div>
  );
}
