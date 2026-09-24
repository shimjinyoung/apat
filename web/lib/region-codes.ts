// 아파트 실거래가 검색(화면 6) 전용 — 국토부 RTMS API용 법정동코드(5자리) 목록.
// 서울 25개 구 + 경기 47개 시/군/구(구 분리 도시는 구 단위 leaf 코드만 사용, 상위 통합 코드는 제외).
//
// 출처: 행정표준코드관리시스템(code.go.kr) "법정동코드목록조회" 공식 조회 화면에서
// 시/도="서울특별시"/"경기도" 선택 시 노출되는 시/군/구 드롭다운을 2026-09-23에 직접 확인해 작성.
// (data.go.kr RTMS API는 법정동코드 자체를 조회하는 기능이 없어, 코드 발급 주체인 이 사이트를 원천으로 삼음)

export interface RegionOption {
  code: string; // 5자리 법정동코드 (LAWD_CD)
  label: string; // "서울특별시 강남구" 형태
}

export interface RegionGroup {
  province: string;
  regions: RegionOption[];
}

export const REGION_GROUPS: RegionGroup[] = [
  {
    province: "서울특별시",
    regions: [
      { code: "11110", label: "종로구" },
      { code: "11140", label: "중구" },
      { code: "11170", label: "용산구" },
      { code: "11200", label: "성동구" },
      { code: "11215", label: "광진구" },
      { code: "11230", label: "동대문구" },
      { code: "11260", label: "중랑구" },
      { code: "11290", label: "성북구" },
      { code: "11305", label: "강북구" },
      { code: "11320", label: "도봉구" },
      { code: "11350", label: "노원구" },
      { code: "11380", label: "은평구" },
      { code: "11410", label: "서대문구" },
      { code: "11440", label: "마포구" },
      { code: "11470", label: "양천구" },
      { code: "11500", label: "강서구" },
      { code: "11530", label: "구로구" },
      { code: "11545", label: "금천구" },
      { code: "11560", label: "영등포구" },
      { code: "11590", label: "동작구" },
      { code: "11620", label: "관악구" },
      { code: "11650", label: "서초구" },
      { code: "11680", label: "강남구" },
      { code: "11710", label: "송파구" },
      { code: "11740", label: "강동구" },
    ],
  },
  {
    province: "경기도",
    regions: [
      { code: "41111", label: "수원시 장안구" },
      { code: "41113", label: "수원시 권선구" },
      { code: "41115", label: "수원시 팔달구" },
      { code: "41117", label: "수원시 영통구" },
      { code: "41131", label: "성남시 수정구" },
      { code: "41133", label: "성남시 중원구" },
      { code: "41135", label: "성남시 분당구" },
      { code: "41150", label: "의정부시" },
      { code: "41171", label: "안양시 만안구" },
      { code: "41173", label: "안양시 동안구" },
      { code: "41192", label: "부천시 원미구" },
      { code: "41194", label: "부천시 소사구" },
      { code: "41196", label: "부천시 오정구" },
      { code: "41210", label: "광명시" },
      { code: "41220", label: "평택시" },
      { code: "41250", label: "동두천시" },
      { code: "41271", label: "안산시 상록구" },
      { code: "41273", label: "안산시 단원구" },
      { code: "41281", label: "고양시 덕양구" },
      { code: "41285", label: "고양시 일산동구" },
      { code: "41287", label: "고양시 일산서구" },
      { code: "41290", label: "과천시" },
      { code: "41310", label: "구리시" },
      { code: "41360", label: "남양주시" },
      { code: "41370", label: "오산시" },
      { code: "41390", label: "시흥시" },
      { code: "41410", label: "군포시" },
      { code: "41430", label: "의왕시" },
      { code: "41450", label: "하남시" },
      { code: "41461", label: "용인시 처인구" },
      { code: "41463", label: "용인시 기흥구" },
      { code: "41465", label: "용인시 수지구" },
      { code: "41480", label: "파주시" },
      { code: "41500", label: "이천시" },
      { code: "41550", label: "안성시" },
      { code: "41570", label: "김포시" },
      { code: "41591", label: "화성시 만세구" },
      { code: "41593", label: "화성시 효행구" },
      { code: "41595", label: "화성시 병점구" },
      { code: "41597", label: "화성시 동탄구" },
      { code: "41610", label: "광주시" },
      { code: "41630", label: "양주시" },
      { code: "41650", label: "포천시" },
      { code: "41670", label: "여주시" },
      { code: "41800", label: "연천군" },
      { code: "41820", label: "가평군" },
      { code: "41830", label: "양평군" },
    ],
  },
];

export const REGION_CODE_SET: ReadonlySet<string> = new Set(
  REGION_GROUPS.flatMap((g) => g.regions.map((r) => r.code)),
);

export function isKnownRegionCode(code: string): boolean {
  return REGION_CODE_SET.has(code);
}

export function findRegionLabel(code: string): string | undefined {
  for (const group of REGION_GROUPS) {
    const hit = group.regions.find((r) => r.code === code);
    if (hit) return `${group.province} ${hit.label}`;
  }
  return undefined;
}
