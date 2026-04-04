/**
 * @typedef {Object} Candidate
 * @property {string} id 후보 고유 ID
 * @property {string} name 후보 이름
 * @property {string} party 정당 이름
 */

/**
 * @typedef {Object} Preference
 * @property {number} rank 순위(1부터 시작)
 * @property {string} candidateId 선택된 후보 ID
 */

/**
 * @typedef {Object} BallotPaper
 * @property {string} id 투표지 고유 ID
 * @property {Preference[]} preferences 선호도 목록
 */

/**
 * @typedef {Object} CandidateTally
 * @property {Candidate} candidate 후보 정보
 * @property {number} votes 득표수
 * @property {boolean} reachedQuota quota 이상 여부
 * @property {boolean} exceededQuota quota 초과 여부
 */

/**
 * @typedef {Object} StvRoundResult
 * @property {number} seatCount 선출 의석 수
 * @property {number} totalBallots 총 투표지 수
 * @property {number} validBallots 유효 투표지 수
 * @property {number} invalidBallots 무효 투표지 수
 * @property {number} droopQuota Droop quota 값
 * @property {CandidateTally[]} tallies 후보별 득표 결과
 * @property {CandidateTally[]} quotaCandidates quota 이상 후보 목록
 */

/**
 * 후보를 생성/삭제/조회한다.
 */
class CandidateManager {
  /**
   * CandidateManager 인스턴스를 초기화한다.
   */
  constructor() {
    /** @type {Map<string, Candidate>} */
    this.candidates = new Map();
    this.sequence = 1;
  }

  /**
   * 새 후보를 등록한다.
   * @param {string} name 후보 이름
   * @param {string} party 정당 이름
   * @returns {Candidate} 생성된 후보
   */
  createCandidate(name, party) {
    const normalizedName = name.trim();
    const normalizedParty = party.trim();

    if (!normalizedName || !normalizedParty) {
      throw new Error("후보 이름과 정당은 필수입니다.");
    }

    const duplicated = this.getCandidates().find(
      (candidate) => candidate.name === normalizedName && candidate.party === normalizedParty
    );

    if (duplicated) {
      throw new Error("동일한 후보(이름+정당)가 이미 존재합니다.");
    }

    const candidate = {
      id: `C-${String(this.sequence).padStart(4, "0")}`,
      name: normalizedName,
      party: normalizedParty
    };

    this.candidates.set(candidate.id, candidate);
    this.sequence += 1;

    return candidate;
  }

  /**
   * 후보 ID로 후보를 삭제한다.
   * @param {string} candidateId 삭제할 후보 ID
   * @returns {boolean} 삭제 성공 여부
   */
  deleteCandidate(candidateId) {
    return this.candidates.delete(candidateId);
  }

  /**
   * 후보 ID로 후보를 조회한다.
   * @param {string} candidateId 조회할 후보 ID
   * @returns {Candidate | undefined} 조회 결과
   */
  getCandidateById(candidateId) {
    return this.candidates.get(candidateId);
  }

  /**
   * 전체 후보 목록을 반환한다.
   * @returns {Candidate[]} 후보 배열
   */
  getCandidates() {
    return Array.from(this.candidates.values());
  }
}

/**
 * 투표지 객체를 메모리에서 생성/삭제/조회한다.
 */
class BallotManager {
  /**
   * BallotManager 인스턴스를 초기화한다.
   */
  constructor() {
    /** @type {Map<string, BallotPaper>} */
    this.ballots = new Map();
    this.sequence = 1;
  }

  /**
   * 선호도 목록을 검증한 뒤 새 투표지를 생성한다.
   * @param {Preference[]} preferences 생성할 투표지 선호도 목록
   * @param {CandidateManager} candidateManager 후보 관리자
   * @returns {BallotPaper} 생성된 투표지
   */
  createBallot(preferences, candidateManager) {
    validatePreferences(preferences, candidateManager);

    const ballot = {
      id: `B-${String(this.sequence).padStart(4, "0")}`,
      preferences: [...preferences]
    };

    this.ballots.set(ballot.id, ballot);
    this.sequence += 1;

    return ballot;
  }

  /**
   * ID로 투표지를 삭제한다.
   * @param {string} ballotId 삭제할 투표지 ID
   * @returns {boolean} 삭제 성공 여부
   */
  deleteBallot(ballotId) {
    return this.ballots.delete(ballotId);
  }

  /**
   * 저장된 투표지 목록을 반환한다.
   * @returns {BallotPaper[]} 투표지 배열
   */
  getBallots() {
    return Array.from(this.ballots.values());
  }

  /**
   * 특정 후보가 투표지에서 사용 중인지 확인한다.
   * @param {string} candidateId 후보 ID
   * @returns {boolean} 사용 여부
   */
  isCandidateInUse(candidateId) {
    return this.getBallots().some((ballot) =>
      ballot.preferences.some((preference) => preference.candidateId === candidateId)
    );
  }
}

/** @type {CandidateManager} */
const candidateManager = new CandidateManager();
/** @type {BallotManager} */
const ballotManager = new BallotManager();

/** @type {HTMLFormElement} */
const candidateForm = document.querySelector("#candidate-form");
/** @type {HTMLInputElement} */
const candidateNameInput = document.querySelector("#candidate-name");
/** @type {HTMLInputElement} */
const candidatePartyInput = document.querySelector("#candidate-party");
/** @type {HTMLDivElement} */
const candidateFeedback = document.querySelector("#candidate-feedback");
/** @type {HTMLTableSectionElement} */
const candidateTableBody = document.querySelector("#candidate-table-body");
/** @type {HTMLTableRowElement} */
const candidateEmptyRow = document.querySelector("#candidate-empty-row");

/** @type {HTMLFormElement} */
const ballotForm = document.querySelector("#ballot-form");
/** @type {HTMLDivElement} */
const preferenceList = document.querySelector("#preference-list");
/** @type {HTMLButtonElement} */
const addPreferenceButton = document.querySelector("#add-preference");
/** @type {HTMLDivElement} */
const ballotFeedback = document.querySelector("#ballot-feedback");
/** @type {HTMLTableSectionElement} */
const ballotTableBody = document.querySelector("#ballot-table-body");
/** @type {HTMLTableRowElement} */
const ballotEmptyRow = document.querySelector("#ballot-empty-row");
/** @type {HTMLSpanElement} */
const ballotCount = document.querySelector("#ballot-count");

/** @type {HTMLFormElement} */
const stvForm = document.querySelector("#stv-form");
/** @type {HTMLInputElement} */
const seatCountInput = document.querySelector("#seat-count");
/** @type {HTMLDivElement} */
const stvFeedback = document.querySelector("#stv-feedback");
/** @type {HTMLDivElement} */
const stvResultContainer = document.querySelector("#stv-result");
/** @type {HTMLStrongElement} */
const summaryTotalBallots = document.querySelector("#summary-total-ballots");
/** @type {HTMLStrongElement} */
const summaryValidBallots = document.querySelector("#summary-valid-ballots");
/** @type {HTMLStrongElement} */
const summaryInvalidBallots = document.querySelector("#summary-invalid-ballots");
/** @type {HTMLStrongElement} */
const summaryQuota = document.querySelector("#summary-quota");
/** @type {HTMLUListElement} */
const quotaCandidateList = document.querySelector("#quota-candidate-list");
/** @type {HTMLTableSectionElement} */
const stvTallyTableBody = document.querySelector("#stv-tally-table-body");

initializeBallotForm();
bindEvents();
renderCandidateList();
renderBallotList();
resetStvResult();

/**
 * 초기 1순위 입력행을 생성한다.
 */
function initializeBallotForm() {
  preferenceList.innerHTML = "";
  preferenceList.appendChild(createPreferenceRow(1, false));
  updateAddPreferenceButtonState();
}

/**
 * 화면 이벤트를 연결한다.
 */
function bindEvents() {
  candidateForm.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      candidateManager.createCandidate(candidateNameInput.value, candidatePartyInput.value);
      candidateNameInput.value = "";
      candidatePartyInput.value = "";
      hideCandidateError();
      renderCandidateList();
      refreshPreferenceCandidateOptions();
      resetStvResult();
    } catch (error) {
      showCandidateError(error instanceof Error ? error.message : "후보를 추가할 수 없습니다.");
    }
  });

  candidateTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-delete-candidate]")) {
      const candidateId = target.getAttribute("data-delete-candidate");
      if (!candidateId) {
        return;
      }

      if (ballotManager.isCandidateInUse(candidateId)) {
        showCandidateError("해당 후보가 포함된 투표지가 있어 삭제할 수 없습니다.");
        return;
      }

      candidateManager.deleteCandidate(candidateId);
      hideCandidateError();
      renderCandidateList();
      refreshPreferenceCandidateOptions();
      resetStvResult();
    }
  });

  addPreferenceButton.addEventListener("click", () => {
    const nextRank = preferenceList.querySelectorAll("[data-preference-row]").length + 1;
    preferenceList.appendChild(createPreferenceRow(nextRank, true));
    updateAddPreferenceButtonState();
  });

  preferenceList.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-remove-preference]")) {
      const row = target.closest("[data-preference-row]");
      if (row) {
        row.remove();
        resequencePreferenceRows();
        updateAddPreferenceButtonState();
      }
    }
  });

  ballotForm.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const preferences = collectPreferencesFromForm();
      ballotManager.createBallot(preferences, candidateManager);
      initializeBallotForm();
      hideBallotError();
      renderBallotList();
      resetStvResult();
    } catch (error) {
      showBallotError(error instanceof Error ? error.message : "투표지를 생성할 수 없습니다.");
    }
  });

  ballotTableBody.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target.matches("[data-delete-ballot]")) {
      const ballotId = target.getAttribute("data-delete-ballot");
      if (ballotId) {
        ballotManager.deleteBallot(ballotId);
        renderBallotList();
        resetStvResult();
      }
    }
  });

  stvForm.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const seatCount = Number(seatCountInput.value);
      const result = runStvFirstRound(ballotManager.getBallots(), candidateManager.getCandidates(), seatCount);
      hideStvError();
      renderStvResult(result);
    } catch (error) {
      showStvError(error instanceof Error ? error.message : "STV 집계를 실행할 수 없습니다.");
    }
  });
}

/**
 * 선호도 입력행을 생성한다.
 * @param {number} rank 생성할 순위 번호
 * @param {boolean} removable 행 삭제 가능 여부
 * @returns {HTMLDivElement} 생성된 입력행
 */
function createPreferenceRow(rank, removable) {
  const row = document.createElement("div");
  row.className = "row g-2 align-items-center";
  row.setAttribute("data-preference-row", "true");

  row.innerHTML = `
    <div class="col-12 col-md-2">
      <label class="form-label mb-0">순위</label>
      <input type="number" class="form-control" value="${rank}" data-rank readonly />
    </div>
    <div class="col-12 col-md-8">
      <label class="form-label mb-0">후보 선택</label>
      <select class="form-select" data-candidate-select ${rank === 1 ? "required" : ""}>
        ${buildCandidateOptionMarkup("")}
      </select>
    </div>
    <div class="col-12 col-md-2 d-grid">
      <button type="button" class="btn btn-outline-danger" data-remove-preference ${removable ? "" : "disabled"}>삭제</button>
    </div>
  `;

  return row;
}

/**
 * 후보 선택용 옵션 HTML 문자열을 생성한다.
 * @param {string} selectedCandidateId 선택되어야 하는 후보 ID
 * @returns {string} option 마크업 문자열
 */
function buildCandidateOptionMarkup(selectedCandidateId) {
  const candidates = candidateManager.getCandidates();
  const defaultSelected = selectedCandidateId === "" ? "selected" : "";

  const options = [`<option value="" ${defaultSelected}>선택 안 함</option>`];

  candidates.forEach((candidate) => {
    const selected = candidate.id === selectedCandidateId ? "selected" : "";
    options.push(
      `<option value="${candidate.id}" ${selected}>${escapeHtml(candidate.name)} (${escapeHtml(candidate.party)})</option>`
    );
  });

  return options.join("");
}

/**
 * 투표지 입력행의 후보 선택 목록을 최신 후보 목록으로 갱신한다.
 */
function refreshPreferenceCandidateOptions() {
  const rows = preferenceList.querySelectorAll("[data-preference-row]");

  rows.forEach((row) => {
    const select = row.querySelector("[data-candidate-select]");
    if (!(select instanceof HTMLSelectElement)) {
      return;
    }

    const previousValue = select.value;
    select.innerHTML = buildCandidateOptionMarkup(previousValue);

    if (!candidateManager.getCandidateById(previousValue)) {
      select.value = "";
    }
  });

  resequencePreferenceRows();
  updateAddPreferenceButtonState();
}

/**
 * 현재 입력행들의 순위를 1부터 연속 번호로 재부여한다.
 */
function resequencePreferenceRows() {
  const rows = preferenceList.querySelectorAll("[data-preference-row]");

  rows.forEach((row, index) => {
    const rankInput = row.querySelector("[data-rank]");
    const select = row.querySelector("[data-candidate-select]");
    const removeButton = row.querySelector("[data-remove-preference]");
    const isFirst = index === 0;

    if (rankInput instanceof HTMLInputElement) {
      rankInput.value = String(index + 1);
    }

    if (select instanceof HTMLSelectElement) {
      select.required = isFirst;
    }

    if (removeButton instanceof HTMLButtonElement) {
      removeButton.disabled = isFirst;
    }
  });
}

/**
 * 선호도 추가 버튼의 활성화 상태를 갱신한다.
 */
function updateAddPreferenceButtonState() {
  const candidateCount = candidateManager.getCandidates().length;
  const rowCount = preferenceList.querySelectorAll("[data-preference-row]").length;
  addPreferenceButton.disabled = candidateCount === 0 || rowCount >= candidateCount;
}

/**
 * 폼 입력값을 선호도 배열로 수집한다.
 * @returns {Preference[]} 선호도 배열
 */
function collectPreferencesFromForm() {
  const rows = preferenceList.querySelectorAll("[data-preference-row]");
  /** @type {Preference[]} */
  const preferences = [];

  rows.forEach((row) => {
    const rankInput = row.querySelector("[data-rank]");
    const select = row.querySelector("[data-candidate-select]");

    if (!(rankInput instanceof HTMLInputElement) || !(select instanceof HTMLSelectElement)) {
      return;
    }

    if (!select.value) {
      return;
    }

    preferences.push({
      rank: Number(rankInput.value),
      candidateId: select.value
    });
  });

  return preferences;
}

/**
 * 선호도 규칙을 검증한다.
 * - 1순위는 필수
 * - 순위는 1부터 시작
 * - 순위는 빈틈 없이 연속 증가
 * - 동일 후보를 중복 선택할 수 없음
 * - 선택한 후보는 후보 목록에 존재해야 함
 * @param {Preference[]} preferences 검증 대상 선호도 목록
 * @param {CandidateManager} candidateManager 후보 관리자
 */
function validatePreferences(preferences, candidateManager) {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    throw new Error("최소 1개의 선호도(1순위)를 입력해야 합니다.");
  }

  const sorted = [...preferences].sort((a, b) => a.rank - b.rank);
  const rankSet = new Set();
  const candidateSet = new Set();

  sorted.forEach((preference, index) => {
    if (!Number.isInteger(preference.rank) || preference.rank < 1) {
      throw new Error("순위는 1 이상의 정수여야 합니다.");
    }

    if (rankSet.has(preference.rank)) {
      throw new Error("순위는 중복될 수 없습니다.");
    }

    if (candidateSet.has(preference.candidateId)) {
      throw new Error("동일 후보를 한 투표지에서 중복 선택할 수 없습니다.");
    }

    if (!candidateManager.getCandidateById(preference.candidateId)) {
      throw new Error("선택한 후보가 후보 목록에 존재하지 않습니다.");
    }

    rankSet.add(preference.rank);
    candidateSet.add(preference.candidateId);

    const expectedRank = index + 1;
    if (preference.rank !== expectedRank) {
      throw new Error("순위는 1부터 시작해 연속으로 입력되어야 합니다.");
    }
  });

  if (sorted[0].rank !== 1) {
    throw new Error("1순위 입력은 필수입니다.");
  }
}

/**
 * STV 1라운드(1순위 집계)를 수행한다.
 * @param {BallotPaper[]} ballots 투표지 목록
 * @param {Candidate[]} candidates 후보 목록
 * @param {number} seatCount 선출 의석 수
 * @returns {StvRoundResult} 집계 결과
 */
function runStvFirstRound(ballots, candidates, seatCount) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("집계를 위해 최소 1명 이상의 후보가 필요합니다.");
  }

  if (!Array.isArray(ballots) || ballots.length === 0) {
    throw new Error("집계를 위해 최소 1개의 투표지가 필요합니다.");
  }

  validateSeatCount(seatCount, candidates.length);

  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const continuingCandidateIds = new Set(candidates.map((candidate) => candidate.id));
  const tallyMap = new Map(candidates.map((candidate) => [candidate.id, 0]));

  let invalidBallots = 0;

  ballots.forEach((ballot) => {
    validateBallotPaper(ballot, candidateMap);

    const topPreference = findHighestContinuingPreference(ballot, continuingCandidateIds);
    if (!topPreference) {
      invalidBallots += 1;
      return;
    }

    const previousVotes = tallyMap.get(topPreference.candidateId) ?? 0;
    tallyMap.set(topPreference.candidateId, previousVotes + 1);
  });

  const validBallots = ballots.length - invalidBallots;
  if (validBallots <= 0) {
    throw new Error("유효표가 없어 Droop quota를 계산할 수 없습니다.");
  }

  const droopQuota = calculateDroopQuota(validBallots, seatCount);

  /** @type {CandidateTally[]} */
  const tallies = candidates
    .map((candidate) => {
      const votes = tallyMap.get(candidate.id) ?? 0;
      return {
        candidate,
        votes,
        reachedQuota: votes >= droopQuota,
        exceededQuota: votes > droopQuota
      };
    })
    .sort((a, b) => b.votes - a.votes || a.candidate.name.localeCompare(b.candidate.name, "ko"));

  const quotaCandidates = tallies.filter((tally) => tally.reachedQuota);

  return {
    seatCount,
    totalBallots: ballots.length,
    validBallots,
    invalidBallots,
    droopQuota,
    tallies,
    quotaCandidates
  };
}

/**
 * 의석 수 입력값을 검증한다.
 * @param {number} seatCount 입력 의석 수
 * @param {number} candidateCount 후보 수
 */
function validateSeatCount(seatCount, candidateCount) {
  if (!Number.isInteger(seatCount) || seatCount < 1) {
    throw new Error("의석 수는 1 이상의 정수여야 합니다.");
  }

  if (seatCount > candidateCount) {
    throw new Error("의석 수는 후보 수보다 클 수 없습니다.");
  }
}

/**
 * 단일 투표지의 구조를 검증한다.
 * @param {BallotPaper} ballot 검증할 투표지
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 */
function validateBallotPaper(ballot, candidateMap) {
  if (!ballot || !Array.isArray(ballot.preferences) || ballot.preferences.length === 0) {
    throw new Error("비어 있는 투표지가 존재합니다.");
  }

  const sorted = [...ballot.preferences].sort((a, b) => a.rank - b.rank);
  const rankSet = new Set();
  const candidateSet = new Set();

  sorted.forEach((preference, index) => {
    if (!Number.isInteger(preference.rank) || preference.rank < 1) {
      throw new Error(`투표지 ${ballot.id}에 잘못된 순위가 있습니다.`);
    }

    if (rankSet.has(preference.rank)) {
      throw new Error(`투표지 ${ballot.id}에 중복 순위가 있습니다.`);
    }

    if (candidateSet.has(preference.candidateId)) {
      throw new Error(`투표지 ${ballot.id}에 중복 후보가 있습니다.`);
    }

    if (!candidateMap.has(preference.candidateId)) {
      throw new Error(`투표지 ${ballot.id}에 존재하지 않는 후보가 포함되어 있습니다.`);
    }

    const expectedRank = index + 1;
    if (preference.rank !== expectedRank) {
      throw new Error(`투표지 ${ballot.id}의 순위가 1부터 연속이 아닙니다.`);
    }

    rankSet.add(preference.rank);
    candidateSet.add(preference.candidateId);
  });

  if (sorted[0].rank !== 1) {
    throw new Error(`투표지 ${ballot.id}는 1순위가 필수입니다.`);
  }
}

/**
 * 투표지에서 현재 계속 후보군에 속한 최상위 선호를 찾는다.
 * @param {BallotPaper} ballot 투표지
 * @param {Set<string>} continuingCandidateIds 계속 후보군 ID 집합
 * @returns {Preference | undefined} 최상위 선호
 */
function findHighestContinuingPreference(ballot, continuingCandidateIds) {
  return [...ballot.preferences]
    .sort((a, b) => a.rank - b.rank)
    .find((preference) => continuingCandidateIds.has(preference.candidateId));
}

/**
 * Droop quota를 계산한다.
 * @param {number} validBallots 유효표 수
 * @param {number} seatCount 선출 의석 수
 * @returns {number} quota 값
 */
function calculateDroopQuota(validBallots, seatCount) {
  if (!Number.isInteger(validBallots) || validBallots <= 0) {
    throw new Error("유효표 수는 1 이상이어야 합니다.");
  }

  if (!Number.isInteger(seatCount) || seatCount <= 0) {
    throw new Error("의석 수는 1 이상이어야 합니다.");
  }

  return Math.floor(validBallots / (seatCount + 1)) + 1;
}

/**
 * 후보 목록을 화면에 렌더링한다.
 */
function renderCandidateList() {
  const candidates = candidateManager.getCandidates();
  candidateTableBody.querySelectorAll("[data-candidate-row]").forEach((row) => row.remove());

  if (candidates.length === 0) {
    candidateEmptyRow.classList.remove("d-none");
    updateAddPreferenceButtonState();
    return;
  }

  candidateEmptyRow.classList.add("d-none");

  candidates.forEach((candidate) => {
    const row = document.createElement("tr");
    row.setAttribute("data-candidate-row", "true");

    const inUse = ballotManager.isCandidateInUse(candidate.id);

    row.innerHTML = `
      <td>${candidate.id}</td>
      <td>${escapeHtml(candidate.name)} (${escapeHtml(candidate.party)})</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete-candidate="${candidate.id}" ${inUse ? "disabled" : ""}>
          삭제
        </button>
      </td>
    `;

    candidateTableBody.appendChild(row);
  });

  updateAddPreferenceButtonState();
}

/**
 * 투표지 목록을 화면에 렌더링한다.
 */
function renderBallotList() {
  const ballots = ballotManager.getBallots();
  ballotCount.textContent = `${ballots.length}개`;

  ballotTableBody.querySelectorAll("[data-ballot-row]").forEach((row) => row.remove());

  if (ballots.length === 0) {
    ballotEmptyRow.classList.remove("d-none");
    renderCandidateList();
    return;
  }

  ballotEmptyRow.classList.add("d-none");

  ballots.forEach((ballot) => {
    const row = document.createElement("tr");
    row.setAttribute("data-ballot-row", "true");

    const preferenceText = ballot.preferences
      .map((preference) => {
        const candidate = candidateManager.getCandidateById(preference.candidateId);
        if (!candidate) {
          return `${preference.rank}순위: (삭제된 후보)`;
        }
        return `${preference.rank}순위: ${candidate.name} (${candidate.party})`;
      })
      .join(", ");

    row.innerHTML = `
      <td>${ballot.id}</td>
      <td>${escapeHtml(preferenceText)}</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete-ballot="${ballot.id}">
          삭제
        </button>
      </td>
    `;

    ballotTableBody.appendChild(row);
  });

  renderCandidateList();
}

/**
 * STV 집계 결과를 화면에 렌더링한다.
 * @param {StvRoundResult} result 집계 결과
 */
function renderStvResult(result) {
  stvResultContainer.classList.remove("d-none");

  summaryTotalBallots.textContent = String(result.totalBallots);
  summaryValidBallots.textContent = String(result.validBallots);
  summaryInvalidBallots.textContent = String(result.invalidBallots);
  summaryQuota.textContent = String(result.droopQuota);

  quotaCandidateList.innerHTML = "";
  if (result.quotaCandidates.length === 0) {
    const item = document.createElement("li");
    item.textContent = "이번 라운드에서 quota 이상 후보가 없습니다.";
    quotaCandidateList.appendChild(item);
  } else {
    result.quotaCandidates.forEach((tally) => {
      const item = document.createElement("li");
      const status = tally.exceededQuota ? "quota 초과" : "quota 정확히 충족";
      item.textContent = `${tally.candidate.name} (${tally.candidate.party}) - ${tally.votes}표 (${status})`;
      quotaCandidateList.appendChild(item);
    });
  }

  stvTallyTableBody.innerHTML = "";
  result.tallies.forEach((tally) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(tally.candidate.name)}</td>
      <td>${escapeHtml(tally.candidate.party)}</td>
      <td>${tally.votes}</td>
      <td>${tally.reachedQuota ? "통과" : "미달"}${tally.exceededQuota ? " (초과)" : ""}</td>
    `;
    stvTallyTableBody.appendChild(row);
  });
}

/**
 * STV 결과 표시를 초기화한다.
 */
function resetStvResult() {
  stvResultContainer.classList.add("d-none");
  hideStvError();
  stvTallyTableBody.innerHTML = "";
  quotaCandidateList.innerHTML = "";
}

/**
 * HTML 특수문자를 이스케이프한다.
 * @param {string} value 입력 문자열
 * @returns {string} 이스케이프 결과
 */
function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * 후보 오류 메시지를 표시한다.
 * @param {string} message 오류 메시지
 */
function showCandidateError(message) {
  candidateFeedback.textContent = message;
  candidateFeedback.classList.remove("d-none");
}

/**
 * 후보 오류 메시지를 숨긴다.
 */
function hideCandidateError() {
  candidateFeedback.textContent = "";
  candidateFeedback.classList.add("d-none");
}

/**
 * 투표지 오류 메시지를 표시한다.
 * @param {string} message 오류 메시지
 */
function showBallotError(message) {
  ballotFeedback.textContent = message;
  ballotFeedback.classList.remove("d-none");
}

/**
 * 투표지 오류 메시지를 숨긴다.
 */
function hideBallotError() {
  ballotFeedback.textContent = "";
  ballotFeedback.classList.add("d-none");
}

/**
 * STV 오류 메시지를 표시한다.
 * @param {string} message 오류 메시지
 */
function showStvError(message) {
  stvFeedback.textContent = message;
  stvFeedback.classList.remove("d-none");
  stvResultContainer.classList.add("d-none");
}

/**
 * STV 오류 메시지를 숨긴다.
 */
function hideStvError() {
  stvFeedback.textContent = "";
  stvFeedback.classList.add("d-none");
}
