/**
 * @typedef {Object} Preference
 * @property {number} rank 순위(1부터 시작)
 * @property {string} candidateName 후보 이름
 * @property {string} partyName 정당 이름
 */

/**
 * @typedef {Object} BallotPaper
 * @property {string} id 투표지 고유 ID
 * @property {Preference[]} preferences 선호도 목록
 */

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
   * @returns {BallotPaper} 생성된 투표지
   */
  createBallot(preferences) {
    validatePreferences(preferences);

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
}

/** @type {BallotManager} */
const ballotManager = new BallotManager();

/** @type {HTMLFormElement} */
const ballotForm = document.querySelector("#ballot-form");
/** @type {HTMLDivElement} */
const preferenceList = document.querySelector("#preference-list");
/** @type {HTMLButtonElement} */
const addPreferenceButton = document.querySelector("#add-preference");
/** @type {HTMLDivElement} */
const formFeedback = document.querySelector("#form-feedback");
/** @type {HTMLTableSectionElement} */
const ballotTableBody = document.querySelector("#ballot-table-body");
/** @type {HTMLTableRowElement} */
const emptyRow = document.querySelector("#empty-row");
/** @type {HTMLSpanElement} */
const ballotCount = document.querySelector("#ballot-count");

initializeForm();
bindEvents();
renderBallotList();

/**
 * 초기 1순위 입력행을 생성한다.
 */
function initializeForm() {
  preferenceList.innerHTML = "";
  preferenceList.appendChild(createPreferenceRow(1, false));
}

/**
 * 화면 이벤트를 연결한다.
 */
function bindEvents() {
  addPreferenceButton.addEventListener("click", () => {
    const nextRank = preferenceList.querySelectorAll("[data-preference-row]").length + 1;
    preferenceList.appendChild(createPreferenceRow(nextRank, true));
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
      }
    }
  });

  ballotForm.addEventListener("submit", (event) => {
    event.preventDefault();

    try {
      const preferences = collectPreferencesFromForm();
      ballotManager.createBallot(preferences);
      initializeForm();
      hideFormError();
      renderBallotList();
    } catch (error) {
      showFormError(error instanceof Error ? error.message : "투표지를 생성할 수 없습니다.");
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
      }
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
    <div class="col-12 col-md-4">
      <label class="form-label mb-0">후보 이름</label>
      <input type="text" class="form-control" data-candidate placeholder="예: Siobhan Murphy" ${rank === 1 ? "required" : ""} />
    </div>
    <div class="col-12 col-md-4">
      <label class="form-label mb-0">정당</label>
      <input type="text" class="form-control" data-party placeholder="예: Green Party" ${rank === 1 ? "required" : ""} />
    </div>
    <div class="col-12 col-md-2 d-grid">
      <button type="button" class="btn btn-outline-danger" data-remove-preference ${removable ? "" : "disabled"}>삭제</button>
    </div>
  `;

  return row;
}

/**
 * 현재 입력행들의 순위를 1부터 연속 번호로 재부여한다.
 */
function resequencePreferenceRows() {
  const rows = preferenceList.querySelectorAll("[data-preference-row]");

  rows.forEach((row, index) => {
    const rankInput = row.querySelector("[data-rank]");
    if (rankInput instanceof HTMLInputElement) {
      rankInput.value = String(index + 1);
    }

    const isFirst = index === 0;
    const removeButton = row.querySelector("[data-remove-preference]");
    const candidateInput = row.querySelector("[data-candidate]");
    const partyInput = row.querySelector("[data-party]");

    if (removeButton instanceof HTMLButtonElement) {
      removeButton.disabled = isFirst;
    }

    if (candidateInput instanceof HTMLInputElement) {
      candidateInput.required = isFirst;
    }

    if (partyInput instanceof HTMLInputElement) {
      partyInput.required = isFirst;
    }
  });
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
    const candidateInput = row.querySelector("[data-candidate]");
    const partyInput = row.querySelector("[data-party]");

    if (
      !(rankInput instanceof HTMLInputElement) ||
      !(candidateInput instanceof HTMLInputElement) ||
      !(partyInput instanceof HTMLInputElement)
    ) {
      return;
    }

    const candidateName = candidateInput.value.trim();
    const partyName = partyInput.value.trim();

    if (!candidateName && !partyName) {
      return;
    }

    if (!candidateName || !partyName) {
      throw new Error("후보 이름과 정당은 함께 입력해야 합니다.");
    }

    preferences.push({
      rank: Number(rankInput.value),
      candidateName,
      partyName
    });
  });

  return preferences;
}

/**
 * 선호도 규칙을 검증한다.
 * - 1순위는 필수
 * - 순위는 1부터 시작
 * - 순위는 빈틈 없이 연속 증가
 * @param {Preference[]} preferences 검증 대상 선호도 목록
 */
function validatePreferences(preferences) {
  if (!Array.isArray(preferences) || preferences.length === 0) {
    throw new Error("최소 1개의 선호도(1순위)를 입력해야 합니다.");
  }

  const sorted = [...preferences].sort((a, b) => a.rank - b.rank);
  const rankSet = new Set();

  sorted.forEach((preference, index) => {
    if (!Number.isInteger(preference.rank) || preference.rank < 1) {
      throw new Error("순위는 1 이상의 정수여야 합니다.");
    }

    if (rankSet.has(preference.rank)) {
      throw new Error("순위는 중복될 수 없습니다.");
    }
    rankSet.add(preference.rank);

    if (!preference.candidateName || !preference.partyName) {
      throw new Error("모든 선호도에는 후보 이름과 정당이 필요합니다.");
    }

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
 * 투표지 목록을 화면에 렌더링한다.
 */
function renderBallotList() {
  const ballots = ballotManager.getBallots();
  ballotCount.textContent = `${ballots.length}개`;

  ballotTableBody.querySelectorAll("[data-ballot-row]").forEach((row) => {
    row.remove();
  });

  if (ballots.length === 0) {
    emptyRow.classList.remove("d-none");
    return;
  }

  emptyRow.classList.add("d-none");

  ballots.forEach((ballot) => {
    const row = document.createElement("tr");
    row.setAttribute("data-ballot-row", "true");

    const preferenceText = ballot.preferences
      .map((preference) => `${preference.rank}순위: ${preference.candidateName} (${preference.partyName})`)
      .join(", ");

    row.innerHTML = `
      <td>${ballot.id}</td>
      <td>${preferenceText}</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-outline-danger" data-delete-ballot="${ballot.id}">
          삭제
        </button>
      </td>
    `;

    ballotTableBody.appendChild(row);
  });
}

/**
 * 폼 오류 메시지를 표시한다.
 * @param {string} message 표시할 오류 메시지
 */
function showFormError(message) {
  formFeedback.textContent = message;
  formFeedback.classList.remove("d-none");
}

/**
 * 폼 오류 메시지를 숨긴다.
 */
function hideFormError() {
  formFeedback.textContent = "";
  formFeedback.classList.add("d-none");
}
