# Ireland Voting Simulation

정적 웹 애플리케이션으로 아일랜드식 PR-STV(Proportional Representation by Single Transferable Vote) 개표 과정을 시뮬레이션한다.  
후보 등록, 투표지 생성, 벌크 시나리오 업로드, 전체 count 집계, count 진행 시각화를 모두 브라우저에서 실행한다.

## 목적

- 아일랜드 STV의 핵심 절차를 단계적으로 보여준다.
- 후보, 투표지, count, quota, surplus, exclusion 같은 선거 객체를 코드와 화면에서 일관되게 표현한다.
- 서버 없이 실행 가능한 학습용/실험용 시뮬레이터를 제공한다.

## 실행 방법

가장 단순한 방법은 정적 파일 서버로 프로젝트 루트를 제공하는 것이다.

예시:

```bash
python3 -m http.server 8000
```

그 뒤 아래 페이지를 연다.

- 메인 시뮬레이터: `http://localhost:8000/index.html`
- 문서 페이지: `http://localhost:8000/docs.html`

`docs.html`은 같은 디렉터리의 `README.md`를 읽어 렌더링한다. 따라서 `file://` 직접 열기보다 정적 서버 환경이 더 안정적이다.

## 화면 구성

### 1. 후보 관리

- 후보 이름과 정당을 입력해 후보를 생성한다.
- 후보는 `CandidateManager`가 메모리에서 관리한다.
- 투표지에서 사용 중인 후보는 삭제할 수 없다.

### 2. 투표지 생성

- 수동 입력으로 한 장씩 투표지를 만들 수 있다.
- 순위는 1부터 연속이어야 하며, 같은 후보를 한 투표지에서 중복 선택할 수 없다.
- 투표지는 `BallotManager`가 메모리에서 관리한다.

### 3. 벌크 시나리오 업로드

- JSON 파일로 후보 목록과 투표지 묶음을 한 번에 불러온다.
- 업로드 시 기존 후보/투표지는 시나리오 내용으로 교체된다.
- 예시 파일은 `scenarios/` 디렉터리를 참고한다.

### 4. STV 전체 집계

- Droop quota를 계산하고 최종 당선자까지 count를 반복한다.
- 결과로 최종 당선자, 최종 tally, count 이력, 시각화 보드를 표시한다.

### 5. Count 진행 시각화

- 선택한 count의 주체 후보, 표 이동, 소진표, 후보별 득표 변화를 실험적으로 시각화한다.
- 후보별 lane, SVG 화살표 흐름, 후보별 count timeline을 제공한다.

## 시나리오 JSON 형식

벌크 업로드와 테스트는 같은 JSON 형식을 사용한다.

```json
{
  "name": "surplus-transfer-basic",
  "seatCount": 2,
  "candidates": [
    { "key": "A", "name": "A 후보", "party": "P1" },
    { "key": "B", "name": "B 후보", "party": "P2" }
  ],
  "ballots": [
    ["A", "B"],
    ["B", "A"]
  ]
}
```

필드 설명:

- `name`: 시나리오 이름
- `seatCount`: 기본 의석 수
- `candidates`: 후보 정의 배열
- `candidates[].key`: 투표지에서 참조할 축약 키
- `candidates[].name`: 화면 표시용 이름
- `candidates[].party`: 정당 이름
- `ballots`: 각 투표지의 선호 순서를 후보 key 배열로 적은 목록

테스트 시나리오에는 아래처럼 `expected` 필드를 추가해 기대 결과를 함께 저장한다.

```json
{
  "expected": {
    "quota": 3,
    "elected": ["A 후보", "B 후보"]
  }
}
```

## STV 공식과 규칙

### Droop quota

코드에서는 다음 공식을 사용한다.

```text
quota = floor(validBallots / (seatCount + 1)) + 1
```

여기서:

- `validBallots`: 유효표 수
- `seatCount`: 선출할 의석 수

구현 위치:

- `js/stv-engine.js`의 `calculateDroopQuota`

### count 진행 순서

현재 구현은 아래 순서로 전체 집계를 반복한다.

1. 모든 유효 투표지의 현재 최상위 continuing 후보를 집계한다.
2. quota 이상 후보를 당선 처리한다.
3. 처리 가능한 surplus가 있으면 surplus 이양 count를 실행한다.
4. surplus 처리 대상이 없으면 최저 득표 continuing 후보를 탈락시킨다.
5. 남은 continuing 후보 수가 남은 의석 수와 같아지면 전원을 당선 처리한다.

### surplus 이양

- surplus는 `candidate votes - quota`로 계산한다.
- 원칙적으로 후보가 방금 받은 최신 parcel을 기준으로 transferable paper를 찾는다.
- 현재 시뮬레이터는 정수 표 단위로 surplus를 분배하며, 배분 잔여는 remainder와 보조 기준으로 정리한다.

구현 위치:

- `selectNextSurplusCandidate`
- `transferSurplus`
- `allocateSurplusTransfers`

### 후보 탈락

- quota를 넘는 후보가 없거나 surplus를 처리하지 않는 경우, continuing 후보 중 최저 득표자를 탈락시킨다.
- 탈락 후보의 표는 다음 continuing 선호 후보로 이동한다.
- 더 이상 유효한 다음 선호가 없으면 소진표가 된다.

구현 위치:

- `selectLowestCandidateForExclusion`
- `excludeCandidate`

### 동률 처리

현재 구현은 결정적 tie-break를 위해 다음 순서로 비교한다.

1. 현재 득표수
2. 원득표 수
3. 이전 count의 역사적 득표 비교
4. 후보 등록 순서

이는 시뮬레이터의 일관된 동작을 위한 결정 규칙이다.

## 용어집

아래 용어는 코드 주석과 가능한 한 같은 이름을 사용한다.

### Candidate

후보 객체. `id`, `name`, `party`를 가진다.

### Preference

한 투표지 안의 개별 선호 정보. `rank`와 `candidateId`를 가진다.

### BallotPaper

투표지 객체. `id`와 `preferences` 배열을 가진다.

### CandidateStatus

후보 상태. 현재 구현 값은 다음과 같다.

- `continuing`: 계속 후보
- `elected`: 당선 후보
- `excluded`: 탈락 후보

### CandidateTally

한 count 종료 시점의 후보 득표 현황. `votes`, `status`, `reachedQuota`, `exceededQuota`를 포함한다.

### Count

개표의 한 단계. UI에서는 `Count 1`, `Count 2`처럼 표시한다.

### StvCountAction

한 count에서 실제로 수행한 작업. 현재 구현의 `type`은 다음과 같다.

- `initial`: 초기 1순위 집계
- `surplus`: surplus 이양
- `exclusion`: 후보 탈락 및 재배분
- `finalisation`: 잔여 후보 자동 당선 처리

### Parcel

특정 count에서 후보에게 묶음으로 도착한 투표지 집합. `CandidateParcel` 타입으로 관리한다.

### ParcelType

parcel이 만들어진 이유를 나타낸다.

- `original`: 초기 배정 표
- `surplus`: surplus 이양으로 받은 표
- `exclusion`: 탈락 후보로부터 받은 표

### Surplus

당선 후보가 quota를 초과한 표 수.

### Exclusion

최저 득표 continuing 후보를 탈락시키고 표를 재배분하는 절차.

### Exhausted ballot / exhausted votes

더 이상 유효한 다음 continuing 선호 후보를 찾지 못한 표.

### Continuing candidate

아직 당선도 탈락도 아닌 계속 후보.

## 코드 구조

### `index.html`

메인 시뮬레이터 페이지.

### `docs.html`

`README.md`를 브라우저에서 렌더링하는 문서 페이지.

### `js/app.js`

폼 처리, 후보/투표지 관리, 집계 실행, 결과 렌더링을 담당하는 UI 엔트리 파일.

### `js/stv-engine.js`

STV 집계 엔진. count 반복, quota 판정, surplus 이양, 탈락 재배분을 담당한다.

### `js/stv-visualization.js`

실험용 시각화 모듈. 후보 lane, 화살표 흐름, count timeline을 렌더링한다.

### `scenarios/*.json`

벌크 업로드와 자동 테스트에 쓰는 시나리오 파일.

### `tests/run-stv-tests.js`

시나리오 기반 회귀 테스트 러너.

## 테스트

구문 검사:

```bash
node --check js/app.js
node --check js/stv-engine.js
node --check js/stv-visualization.js
```

시나리오 테스트:

```bash
node tests/run-stv-tests.js
```

현재 포함된 검증 시나리오:

- `surplus-transfer-basic`
- `finalisation-after-exclusion`
- `exhausted-ballots`
- `tie-break-by-order`

## 참고

이 프로젝트는 학습용 시뮬레이터다.  
실제 아일랜드 개표 규칙의 모든 예외와 법적 세부사항을 완전히 재현하는 것을 목표로 하지는 않는다.  
다만 quota, surplus, exclusion, continuing 후보, exhausted ballot 같은 핵심 개념은 코드와 UI에서 일관되게 다루도록 유지한다.
