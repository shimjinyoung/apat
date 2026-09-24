// 9개 지표 메타데이터 — docs/data-sources.md, docs/scoring-model.md 와 반드시 동기화된 상태를 유지한다.
// 이 파일은 "정의"만 담는다. 실제 값(시계열)은 web/data/history.generated.json 에서 채운다.

export type Category = "경매" | "가격" | "거래" | "금리" | "전세" | "공급" | "위험";

export type IndicatorId =
  | "auction_win_rate"
  | "auction_win_price_ratio"
  | "auction_case_count"
  | "price_index_weekly"
  | "trade_volume"
  | "jeonse_ratio"
  | "jeonse_supply_demand_index"
  | "unsold_housing"
  | "move_in_volume"
  | "mortgage_delinquency"
  | "mortgage_rate";

export interface IndicatorMeta {
  id: IndicatorId;
  category: Category;
  label: string;
  /** 스코어링 가중치 — docs/scoring-model.md §1 과 반드시 일치 */
  weight: number;
  /** 선행지표 여부 — 오버라이드 규칙(§5)에서 사용 */
  isLeading: boolean;
  sourceName: string;
  sourceUrl: string;
  unit: string;
  /** 이 지표가 무엇을 뜻하는지, 왜 매수 판단에 쓰는지 — 히스토리 모달 등에서 노출 */
  description: string;
  /** true면 자동수집 불가(robots.txt 등)라 /manual-entry 화면에서 사람이 값을 입력한다 */
  isManual?: boolean;
}

export const INDICATORS: IndicatorMeta[] = [
  {
    id: "price_index_weekly",
    category: "가격",
    label: "서울 아파트 주간 매매가격지수(평균가 포함)",
    weight: 1.0,
    isLeading: false,
    sourceName: "KOSIS 경유 한국부동산원 주간 아파트 매매가격지수",
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_304004_WEEK_002_C",
    unit: "지수",
    description:
      "매주 발표되는 서울 아파트 매매가격 수준(기준시점=100). 하락폭이 줄어들거나 상승 전환하면 가격 조정이 마무리 국면에 들어섰다는 뜻. 히스토리 모달에 실거래 평균가격(㎡당)도 보조축으로 같이 표시.",
  },
  {
    id: "trade_volume",
    category: "거래",
    label: "서울 아파트 매매거래량",
    weight: 1.5,
    isLeading: true,
    sourceName: "국토부 실거래가 Open API (data.go.kr)",
    sourceUrl: "https://www.data.go.kr/data/15126468/openapi.do",
    unit: "건",
    description:
      "한 달간 실제 거래된 건수. 가격이 움직이기 전에 거래량이 먼저 회복되는 경우가 많아 대표적인 선행지표. 전년 동월 대비 뚜렷이 늘면 실수요·투자수요 복귀 신호.",
  },
  {
    id: "mortgage_rate",
    category: "금리",
    label: "주택담보대출 금리(신규취급액)",
    weight: 1.0,
    isLeading: true,
    sourceName: "한국은행 ECOS 예금은행 대출금리(신규취급액, 주택담보대출)",
    sourceUrl: "https://ecos.bok.or.kr/#/SearchStat",
    unit: "%",
    description:
      "은행이 새로 내주는 주택담보대출의 평균 금리(연 %). 3개월 전보다 0.25%p 이상 오르면 매수 여력이 줄어드는 신호(비우호), 0.25%p 이상 내리면 우호. 한국은행 기준금리는 계단식으로만 움직여 채점이 어려워, 실제 대출 부담을 반영하는 이 값으로 채점하고 기준금리는 차트 보조축(점선)으로 같이 표시(채점 미반영). 2026-09-22 추가(사용자 결정).",
  },
  {
    id: "auction_win_rate",
    category: "경매",
    label: "서울 아파트 낙찰률(경매 성사율)",
    weight: 1.0,
    isLeading: false,
    sourceName: "대법원 법원경매정보 용도별 매각통계(서울, 아파트)",
    sourceUrl: "https://www.courtauction.go.kr/pgj/index.on?w2xPath=%2Fpgj%2Fui%2Fpgj100%2FPGJ164M01.xml",
    unit: "%",
    description:
      "경매에 나온 물건 중 실제로 낙찰된 비율(법원 공식 집계: 매각건수/경매건수×100). 낮을수록(특히 30%대) 시장 심리가 위축된 것이고, 저점 대비 반등하기 시작하면 저가 매수세가 살아난다는 신호. 2026-09-13 지지옥션(뉴스 인용, 참고용)에서 법원경매정보 공식 API로 전환(사용자 결정) — 두 출처의 방법론이 달라 수치가 약간 다를 수 있음.",
  },
  {
    id: "auction_win_price_ratio",
    category: "경매",
    label: "서울 아파트 낙찰가율(감정가 대비 %)",
    weight: 1.0,
    isLeading: false,
    sourceName: "대법원 법원경매정보 용도별 매각통계(서울, 아파트)",
    sourceUrl: "https://www.courtauction.go.kr/pgj/index.on?w2xPath=%2Fpgj%2Fui%2Fpgj100%2FPGJ164M01.xml",
    unit: "%",
    description:
      "감정가 대비 실제 낙찰가 비율(법원 공식 집계: 매각가/감정가×100). 80%대 초반까지 떨어졌다가 다시 오르기 시작하면 급매물이 소진되고 실수요가 돌아오고 있다는 뜻. 2026-09-13 지지옥션(뉴스 인용, 참고용)에서 법원경매정보 공식 API로 전환(사용자 결정) — 두 출처의 방법론이 달라 수치가 약간 다를 수 있음.",
  },
  {
    id: "auction_case_count",
    category: "경매",
    label: "서울 아파트 경매 진행건수",
    weight: 1.0,
    isLeading: false,
    sourceName: "태인경매 낙찰통계(최근 1개월 롤링)",
    sourceUrl: "https://www.taein.co.kr/auction/statistics/main_stat.php",
    unit: "건",
    description:
      "서울 아파트 경매에 새로 나오는 물건 수(절대량). 계속 늘면 대출 연체·강제매각 등 부실이 확산되는 신호(비우호)이고, 정점을 찍고 줄어들면 부실 정리가 마무리되어 간다는 신호(우호). 2026-09-13 '전체 경매물건 대비 아파트 비중(%)'에서 이 정의로 변경(사용자 결정) — 토지·차량 등 무관한 분모를 없애 더 직관적으로 만듦.",
  },
  {
    id: "jeonse_ratio",
    category: "전세",
    label: "서울 전세가격지수(주간 변동률)",
    weight: 1.5,
    isLeading: true,
    sourceName: "KOSIS 경유 한국부동산원 주간 아파트 전세가격지수",
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_304004_WEEK_004_C",
    unit: "지수",
    description:
      "매주 발표되는 서울 아파트 전세가격 수준. 전세가 오르면 매매-전세 갭이 줄어 갭투자 여력이 커지고, 보통 몇 주~몇 달 뒤 매매 수요로 이어지는 선행지표.",
  },
  {
    id: "jeonse_supply_demand_index",
    category: "전세",
    label: "전세수급동향지수",
    weight: 1.5,
    isLeading: true,
    sourceName: "KOSIS 경유 한국부동산원 전세수급동향",
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=408&tblId=DT_40803_N0009",
    unit: "지수",
    description:
      "전세 매물 대비 수요 심리를 나타내는 지수(기준선 100). 100을 넘으면 전세를 구하는 사람이 매물보다 많다는 뜻 — 실제 거래·가격이 움직이기 전에 나타나는 선행 심리지표.",
  },
  {
    id: "unsold_housing",
    category: "공급",
    label: "서울 미분양(월간)",
    weight: 0.75,
    isLeading: false,
    sourceName: "KOSIS 경유 국토교통부 시·군·구별 미분양현황",
    sourceUrl: "https://kosis.kr/statHtml/statHtml.do?orgId=116&tblId=DT_MLTM_2082",
    unit: "호",
    description:
      "서울 25개 구의 미분양 아파트 합계. 계속 늘면 공급 과잉·수요 부진 신호이고, 정점을 찍고 줄어들기 시작하면 공급 부담이 해소되고 있다는 뜻.",
  },
  {
    id: "move_in_volume",
    category: "공급",
    label: "서울 아파트 월간 입주가구수",
    weight: 0.75,
    isLeading: false,
    sourceName: "부동산R114/언론 보도 (수동 입력)",
    sourceUrl: "https://r114.com/",
    unit: "가구",
    description:
      "그 달에 실제로 입주하는 서울 아파트 가구 수. 계속 늘면 공급 부담(비우호), 줄어드는 구간(공급절벽)에 들어서면 중기적으로 가격 상방 압력 신호(우호). 2026-09-13 '연간 입주 예정 전망치'에서 이 정의로 변경(사용자 결정) — 수도권/전국 수치와 섞이지 않도록 반드시 '서울' 단독 수치만 사용.",
    isManual: true,
  },
  {
    id: "mortgage_delinquency",
    category: "위험",
    label: "서울 주택담보대출 연체율",
    weight: 1.0,
    isLeading: false,
    sourceName: "한국은행 ECOS 예금은행 지역별 연체율(주택관련대출, 서울)",
    sourceUrl: "https://ecos.bok.or.kr/#/SearchStat",
    unit: "%",
    description:
      "서울 지역 은행의 주택담보대출 중 1개월 이상 연체된 대출의 비율. 계속 오르면 대출 상환 부담으로 인한 부실·강제매각(경매)이 확산되는 신호(비우호)이고, 하락 전환하면 연체가 정리되고 있다는 신호(우호). 2026-09-13 추가 — '수도권' 통합 수치는 ECOS에 공식 통계로 없어(서울·인천·경기 개별 제공, 가중평균 불가) 다른 지표와 일관되게 서울 단독 값만 사용. ECOS Open API로 자동 수집(2026-09-13, API 키 발급 완료).",
  },
];

export const WEIGHT_SUM = INDICATORS.reduce((sum, i) => sum + i.weight, 0);
