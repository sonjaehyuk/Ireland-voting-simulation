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

  /**
   * 전체 후보를 초기화한다.
   */
  reset() {
    this.candidates.clear();
    this.sequence = 1;
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

  /**
   * 전체 투표지를 초기화한다.
   */
  reset() {
    this.ballots.clear();
    this.sequence = 1;
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
/** @type {HTMLInputElement} */
const bulkScenarioFileInput = document.querySelector("#bulk-scenario-file");
/** @type {HTMLButtonElement} */
const bulkImportButton = document.querySelector("#bulk-import-button");
/** @type {HTMLDivElement} */
const bulkImportFeedback = document.querySelector("#bulk-import-feedback");
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
const electedCandidateList = document.querySelector("#elected-candidate-list");
/** @type {HTMLTableSectionElement} */
const stvTallyTableBody = document.querySelector("#stv-tally-table-body");
/** @type {HTMLTableSectionElement} */
const stvCountHistoryBody = document.querySelector("#stv-count-history-body");

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

  bulkImportButton.addEventListener("click", async () => {
    try {
      const file = bulkScenarioFileInput.files?.[0];
      if (!file) {
        throw new Error("불러올 JSON 파일을 먼저 선택해야 합니다.");
      }

      const text = await file.text();
      const scenario = parseScenarioFile(text);
      applyScenarioToManagers(scenario);
      showBulkImportSuccess(
        `${scenario.name} 시나리오를 불러왔습니다. 후보 ${scenario.candidates.length}명, 투표지 ${scenario.ballots.length}개`
      );
    } catch (error) {
      showBulkImportError(error instanceof Error ? error.message : "시나리오 파일을 불러올 수 없습니다.");
    }
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
      hideBulkImportFeedback();
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
        hideBulkImportFeedback();
        renderBallotList();
        resetStvResult();
      }
    }
  });

  stvForm.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const seatCount = Number(seatCountInput.value);
      const result = window.StvEngine.runStvElection(
        ballotManager.getBallots(),
        candidateManager.getCandidates(),
        seatCount
      );
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
 * @param {Preference[]} preferences 검증 대상 선호도 목록
 * @param {CandidateManager} manager 후보 관리자
 */
function validatePreferences(preferences, manager) {
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

    if (!manager.getCandidateById(preference.candidateId)) {
      throw new Error("선택한 후보가 후보 목록에 존재하지 않습니다.");
    }

    rankSet.add(preference.rank);
    candidateSet.add(preference.candidateId);

    if (preference.rank !== index + 1) {
      throw new Error("순위는 1부터 시작해 연속으로 입력되어야 합니다.");
    }
  });

  if (sorted[0].rank !== 1) {
    throw new Error("1순위 입력은 필수입니다.");
  }
}

/**
 * 시나리오 JSON 문자열을 파싱하고 검증한다.
 * @param {string} fileText 파일 문자열
 * @returns {{name: string, seatCount: number | null, candidates: Array<{key: string, name: string, party: string}>, ballots: Array<Array<string>>}} 파싱 결과
 */
function parseScenarioFile(fileText) {
  let parsed;

  try {
    parsed = JSON.parse(fileText);
  } catch (error) {
    throw new Error("JSON 파싱에 실패했습니다. 파일 형식을 확인해 주세요.");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("시나리오 파일의 최상위 구조는 객체여야 합니다.");
  }

  const name = typeof parsed.name === "string" && parsed.name.trim() ? parsed.name.trim() : "이름 없는 시나리오";
  const seatCount = parsed.seatCount === undefined ? null : Number(parsed.seatCount);

  if (seatCount !== null && (!Number.isInteger(seatCount) || seatCount < 1)) {
    throw new Error("seatCount는 1 이상의 정수여야 합니다.");
  }

  if (!Array.isArray(parsed.candidates) || parsed.candidates.length === 0) {
    throw new Error("candidates 배열에 최소 1명 이상의 후보가 필요합니다.");
  }

  if (!Array.isArray(parsed.ballots) || parsed.ballots.length === 0) {
    throw new Error("ballots 배열에 최소 1개 이상의 투표지가 필요합니다.");
  }

  const candidates = parsed.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== "object") {
      throw new Error(`candidates[${index}]는 객체여야 합니다.`);
    }

    const key = typeof candidate.key === "string" ? candidate.key.trim() : "";
    const nameValue = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const partyValue = typeof candidate.party === "string" ? candidate.party.trim() : "";

    if (!key || !nameValue || !partyValue) {
      throw new Error(`candidates[${index}]에는 key, name, party가 모두 필요합니다.`);
    }

    return {
      key,
      name: nameValue,
      party: partyValue
    };
  });

  const candidateKeySet = new Set();
  candidates.forEach((candidate) => {
    if (candidateKeySet.has(candidate.key)) {
      throw new Error(`후보 key '${candidate.key}'가 중복되었습니다.`);
    }
    candidateKeySet.add(candidate.key);
  });

  const ballots = parsed.ballots.map((ballot, ballotIndex) => {
    if (!Array.isArray(ballot) || ballot.length === 0) {
      throw new Error(`ballots[${ballotIndex}]는 최소 1개 이상의 후보 key를 포함한 배열이어야 합니다.`);
    }

    const normalizedBallot = ballot.map((candidateKey, preferenceIndex) => {
      if (typeof candidateKey !== "string" || !candidateKey.trim()) {
        throw new Error(`ballots[${ballotIndex}][${preferenceIndex}]는 후보 key 문자열이어야 합니다.`);
      }
      return candidateKey.trim();
    });

    const duplicated = new Set();
    normalizedBallot.forEach((candidateKey) => {
      if (!candidateKeySet.has(candidateKey)) {
        throw new Error(`ballots[${ballotIndex}]에 등록되지 않은 후보 key '${candidateKey}'가 있습니다.`);
      }

      if (duplicated.has(candidateKey)) {
        throw new Error(`ballots[${ballotIndex}]에 후보 key '${candidateKey}'가 중복되었습니다.`);
      }

      duplicated.add(candidateKey);
    });

    return normalizedBallot;
  });

  return {
    name,
    seatCount,
    candidates,
    ballots
  };
}

/**
 * 시나리오 데이터를 화면 상태에 반영한다.
 * @param {{name: string, seatCount: number | null, candidates: Array<{key: string, name: string, party: string}>, ballots: Array<Array<string>>}} scenario 시나리오 데이터
 */
function applyScenarioToManagers(scenario) {
  candidateManager.reset();
  ballotManager.reset();

  const candidateIdByKey = new Map();
  scenario.candidates.forEach((candidate) => {
    const createdCandidate = candidateManager.createCandidate(candidate.name, candidate.party);
    candidateIdByKey.set(candidate.key, createdCandidate.id);
  });

  scenario.ballots.forEach((ballotKeys) => {
    ballotManager.createBallot(
      ballotKeys.map((candidateKey, index) => ({
        rank: index + 1,
        candidateId: candidateIdByKey.get(candidateKey)
      })),
      candidateManager
    );
  });

  if (scenario.seatCount !== null) {
    seatCountInput.value = String(scenario.seatCount);
  }

  initializeBallotForm();
  hideCandidateError();
  hideBallotError();
  renderCandidateList();
  refreshPreferenceCandidateOptions();
  renderBallotList();
  resetStvResult();
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
 * @param {import("./stv-engine.js").StvElectionResult | any} result 집계 결과
 */
function renderStvResult(result) {
  stvResultContainer.classList.remove("d-none");

  summaryTotalBallots.textContent = String(result.totalBallots);
  summaryValidBallots.textContent = String(result.validBallots);
  summaryInvalidBallots.textContent = String(result.invalidBallots);
  summaryQuota.textContent = String(result.droopQuota);

  electedCandidateList.innerHTML = "";
  if (result.electedCandidates.length === 0) {
    const item = document.createElement("li");
    item.textContent = "아직 당선자가 확정되지 않았습니다.";
    electedCandidateList.appendChild(item);
  } else {
    result.electedCandidates.forEach((candidate, index) => {
      const item = document.createElement("li");
      item.textContent = `${index + 1}. ${candidate.name} (${candidate.party})`;
      electedCandidateList.appendChild(item);
    });
  }

  stvTallyTableBody.innerHTML = "";
  result.finalTallies.forEach((tally) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(tally.candidate.name)}</td>
      <td>${escapeHtml(tally.candidate.party)}</td>
      <td>${tally.votes}</td>
      <td>${renderCandidateStatusText(tally)}</td>
    `;
    stvTallyTableBody.appendChild(row);
  });

  stvCountHistoryBody.innerHTML = "";
  result.counts.forEach((count) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${count.countNumber}</td>
      <td>${escapeHtml(count.action.description)}</td>
      <td>${escapeHtml(formatTransferSummary(count, candidateManager))}</td>
      <td>${escapeHtml(formatCandidateNames(count.newlyElected))}</td>
    `;
    stvCountHistoryBody.appendChild(row);
  });
}

/**
 * 후보 상태 텍스트를 렌더링한다.
 * @param {{status: string, reachedQuota: boolean, exceededQuota: boolean}} tally 후보 집계 정보
 * @returns {string} 상태 문자열
 */
function renderCandidateStatusText(tally) {
  if (tally.status === "elected") {
    return tally.exceededQuota ? "당선 (quota 초과)" : "당선";
  }

  if (tally.status === "excluded") {
    return "탈락";
  }

  return tally.reachedQuota ? "quota 도달" : "계속";
}

/**
 * count별 표 이동 요약 문자열을 생성한다.
 * @param {any} count count 정보
 * @param {CandidateManager} manager 후보 관리자
 * @returns {string} 요약 문자열
 */
function formatTransferSummary(count, manager) {
  if (!count.action.transfers || count.action.transfers.length === 0) {
    return count.action.exhaustedVotes > 0 ? `소진 ${count.action.exhaustedVotes}표` : "-";
  }

  const transferText = count.action.transfers
    .map((transfer) => {
      const candidate = manager.getCandidateById(transfer.candidateId);
      const candidateName = candidate ? `${candidate.name}` : transfer.candidateId;
      return `${candidateName} ${transfer.votes}표`;
    })
    .join(", ");

  if (count.action.exhaustedVotes > 0) {
    return `${transferText}, 소진 ${count.action.exhaustedVotes}표`;
  }

  return transferText;
}

/**
 * 후보 이름 목록을 문자열로 변환한다.
 * @param {Candidate[]} candidates 후보 목록
 * @returns {string} 이름 문자열
 */
function formatCandidateNames(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return "-";
  }

  return candidates.map((candidate) => `${candidate.name} (${candidate.party})`).join(", ");
}

/**
 * STV 결과 표시를 초기화한다.
 */
function resetStvResult() {
  stvResultContainer.classList.add("d-none");
  hideStvError();
  stvTallyTableBody.innerHTML = "";
  stvCountHistoryBody.innerHTML = "";
  electedCandidateList.innerHTML = "";
}

/**
 * 벌크 업로드 성공 메시지를 표시한다.
 * @param {string} message 성공 메시지
 */
function showBulkImportSuccess(message) {
  bulkImportFeedback.textContent = message;
  bulkImportFeedback.classList.remove("d-none", "alert-danger");
  bulkImportFeedback.classList.add("alert-success");
}

/**
 * 벌크 업로드 오류 메시지를 표시한다.
 * @param {string} message 오류 메시지
 */
function showBulkImportError(message) {
  bulkImportFeedback.textContent = message;
  bulkImportFeedback.classList.remove("d-none", "alert-success");
  bulkImportFeedback.classList.add("alert-danger");
}

/**
 * 벌크 업로드 메시지를 숨긴다.
 */
function hideBulkImportFeedback() {
  bulkImportFeedback.textContent = "";
  bulkImportFeedback.classList.add("d-none");
  bulkImportFeedback.classList.remove("alert-success", "alert-danger");
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
