# Ireland Voting Simulation

아일랜드식 PR-STV(Proportional Representation by Single Transferable Vote) 개표 과정을 시뮬레이션합니다.  
후보 등록, 투표지 생성, 벌크 시나리오 업로드, 전체 count 집계, count 진행 시각화를 모두 브라우저에서 실행할 수 있습니다.

### 목차
* [화면 구성](#화면-구성)
* [시나리오 JSON 형식](#시나리오-json-형식)
* [시나리오 샘플](#시나리오-샘플): **벌크 시나리오 업로드** 관련
* [STV 공식과 규칙](#stv-공식과-규칙)
* [용어집](#용어집)
* [테스트](#테스트)
* [저작권 안내](#저작권-안내)

## 화면 구성

### 1. 후보 관리

- 후보 이름과 정당을 입력해 후보를 생성합니다.
- 후보는 `CandidateManager`가 메모리에서 관리합니다.
- 투표지에서 사용 중인 후보는 삭제할 수 없습니다.

### 2. 투표지 생성

- 수동 입력으로 한 장씩 투표지를 만들 수 있습니다.
- 순위는 1부터 연속이어야 하며, 같은 후보를 한 투표지에서 중복 선택할 수 없다.
- 투표지는 `BallotManager`가 메모리에서 관리합니다.

### 3. 벌크 시나리오 업로드

- JSON 파일로 후보 목록과 투표지 묶음을 한 번에 불러옵니다.
- 업로드 시 기존 후보/투표지는 시나리오 내용으로 교체됩니다.
- 예시 파일은 `scenarios/` 디렉터리를 참고하세요.

### 4. STV 전체 집계

- Droop quota를 계산하고 최종 당선자까지 count를 반복합니다.
- 결과로 최종 당선자, 최종 tally, count 이력, 시각화 보드를 표시합니다.

### 5. Count 진행 시각화

- 선택한 count의 주체 후보, 표 이동, 소진표, 후보별 득표 변화를 실험적으로 시각화합니다.
- 후보별 lane, SVG 화살표 흐름, 후보별 count timeline을 제공합니다.

## 시나리오 JSON 형식

벌크 업로드와 테스트는 같은 JSON 형식을 사용합니다.

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

테스트 시나리오에는 아래처럼 `expected` 필드를 추가해 기대 결과를 함께 저장할 수 있습니다.

```json
{
  "expected": {
    "quota": 3,
    "elected": ["A 후보", "B 후보"]
  }
}
```

## 시나리오 샘플

아래 경로로 접속하여 벌크 시나리오 샘플 파일을 내려받으세요. 그 파일을 벌크 시나리오에 업로드하여 빠르게 STV 예시를 확인할 수 있습니다.

- `/scenarios/surplus-transfer-basic.json`
  - quota를 넘긴 후보의 surplus 이양과 그 이후 count 진행을 짧게 확인하는 기본 예제
- `/scenarios/finalisation-after-exclusion.json`
  - exclusion 이후 남은 continuing 후보 수가 잔여 의석 수와 같아져 자동 당선으로 끝나는 예제
- `/scenarios/exhausted-ballots.json`
  - 다음 선호가 부족한 표가 exhausted votes로 떨어지는 흐름을 확인하는 예제
- `/scenarios/tie-break-by-order.json`
  - 단순 동률에서 현재 구현의 결정론적 tie-break가 어떤 순서로 작동하는지 보는 예제
- `/scenarios/metro-three-seat-crowded.json`
  - (**추천**) 3석, 8명 후보, 많은 선호 조합이 섞인 도시형 대규모 시나리오로 여러 exclusion과 늦은 당선 확정을 관찰하는 예제
- `/scenarios/county-two-seat-messy.json`
  - 2석, 7명 후보, 지역 선거처럼 선호가 뒤섞인 난삽한 시나리오로 반복적인 exclusion count를 관찰하는 예제
- `/scenarios/chained-transfer-after-exclusion.json`
  - (**추천**) 한 번 이동한 표가 나중에 탈락한 후보를 거쳐 다시 다음 선호 후보로 재이양되는 연쇄 이동 흐름을 보는 예제

## STV 공식과 규칙

### Droop quota

코드에서는 다음 공식을 사용합니다.

```text
quota = floor(validBallots / (seatCount + 1)) + 1
```

여기서:

- `validBallots`: 유효표 수
- `seatCount`: 선출할 의석 수

(참고) 구현 위치:

- `js/stv-engine.js`의 `calculateDroopQuota`

### count 진행 순서

현재 구현은 아래 순서로 전체 집계를 반복합니다.

1. 모든 유효 투표지의 현재 최상위 continuing 후보를 집계합니다.
2. quota 이상 후보를 당선 처리합니다.
3. 처리 가능한 잉여표(surplus)가 있으면 surplus 이양 count를 실행합니다.
4. surplus 처리 대상이 없으면 최저 득표 continuing 후보를 탈락시킵니다.
5. 남은 continuing 후보 수가 남은 의석 수와 같아지면 전원을 당선 처리합니다.

### surplus 이양

- surplus는 `candidate votes - quota`로 계산합니다.
- 원칙적으로 후보가 방금 받은 최신 parcel을 기준으로 transferable paper를 찾습니다.
- 현재 시뮬레이터는 정수 표 단위로 surplus를 분배하며, 배분 잔여는 remainder와 보조 기준으로 정리합니다.

구현 위치:

- `selectNextSurplusCandidate`
- `transferSurplus`
- `allocateSurplusTransfers`

### 후보 탈락

- quota를 넘는 후보가 없거나 surplus를 처리하지 않는 경우, continuing 후보 중 최저 득표자를 탈락시킵니다.
- 탈락 후보의 표는 다음 continuing 선호 후보로 이동합니다.
- 더 이상 유효한 다음 선호가 없으면 소진표가 됩니다.

구현 위치:

- `selectLowestCandidateForExclusion`
- `excludeCandidate`

### 동률 처리

현재 구현은 결정론적 tie-break를 위해 다음 순서로 비교합니다.

1. 현재 득표수
2. 원득표 수
3. 이전 count의 역사적 득표 비교
4. 후보 등록 순서

> [!IMPORTANT]
> 실제 아일랜드 선거 방식과는 다를 수도 있습니다(조사 안함).

## 용어집

아래 용어는 코드 주석과 가능한 한 같은 이름을 사용하였습니다.

### Candidate

후보 객체. `id`, `name`, `party`로 구성됩니다.

### Preference

한 투표지 안의 개별 선호 정보. `rank`와 `candidateId`를 가집니다.

### BallotPaper

투표지 객체. `id`와 `preferences` 배열을 가집니다.

### CandidateStatus

후보 상태. 현재 구현 값은 다음과 같습니다.

- `continuing`: 계속 후보. 당선자 수를 늘린다면 당선 가능할 수도 있는 사람입니다.
- `elected`: 당선 후보
- `excluded`: 탈락 후보

### CandidateTally

한 count 종료 시점의 후보 득표 현황. `votes`, `status`, `reachedQuota`, `exceededQuota`를 포함합니다.

### Count

개표의 한 단계. **Round**라고도 불립니다. UI에서는 `Count 1`, `Count 2`처럼 표시합니다.

### StvCountAction

한 count에서 실제로 수행한 작업. 현재 구현의 `type`은 다음과 같습니다.

- `initial`: 초기 1순위 집계
- `surplus`: surplus 이양
- `exclusion`: 후보 탈락 및 재배분
- `finalisation`: 잔여 후보 자동 당선 처리

### Parcel

특정 count에서 후보에게 묶음으로 도착한 투표지 집합. `CandidateParcel` 타입으로 관리합니다.

### ParcelType

parcel이 만들어진 이유를 나타냅니다.

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

## 저작권 안내

이 서비스는 **자유소프트웨어**입니다. 당신은 이것을 실행하고, 복제하고, 배포하고, 연구하고, 수정하고, 개선할 자유, 그리고 그 결과를 공유할 책임이 있습니다. 이 서비스는 자유와 개인을 보호하며 사회를 진보시키고자 하는 선조들의 어깨 위에서 만들어졌습니다.
