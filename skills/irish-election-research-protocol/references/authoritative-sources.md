# Authoritative Sources and Query Rules

## 1. 우선 확인 도메인
- `https://www.electoralcommission.ie/`
- `https://www.irishstatutebook.ie/`
- `https://www.oireachtas.ie/`
- `https://www.gov.ie/`
- `https://www.electionsireland.org/`

## 2. 추천 검색식 템플릿
아래 템플릿을 질문에 맞게 치환해 사용한다.

1. 제도/절차
- `site:electoralcommission.ie PR-STV Ireland counting process`
- `site:irishstatutebook.ie electoral act transfer of surplus`

2. 법령 조문 확인
- `site:irishstatutebook.ie "Electoral Act" quota`
- `site:oireachtas.ie Electoral Reform Act debate`

3. 운영/일정
- `site:gov.ie local elections date Ireland`
- `site:electoralcommission.ie guidance voter`

4. 결과/통계
- `site:electionsireland.org constituency results`
- `site:cso.ie election statistics Ireland`

## 3. 충돌 해결 규칙
1. 법적 효력 해석이 충돌하면 `irishstatutebook.ie` 최신 개정본을 우선한다.
2. 절차 설명이 충돌하면 선관위 최신 가이드와 법령 원문을 대조한다.
3. 일정/시행일 충돌 시 가장 최근 공고 날짜가 있는 정부 공지를 우선한다.
4. 그래도 해결되지 않으면 "검증 미완료"로 남기고 사용자 확인 항목으로 승격한다.

## 4. 로그 최소 항목
조사 로그에 아래를 남긴다.
- 검색식
- 접근 URL
- 문서 제목
- 게시/개정/시행일
- 채택/기각 사유

## 5. 제외 규칙
다음은 단독 근거로 사용하지 않는다.
- 출처 미상 블로그/포럼
- 2차 인용만 있고 원문 링크가 없는 기사
- 날짜가 없거나 오래된 비공식 요약본
