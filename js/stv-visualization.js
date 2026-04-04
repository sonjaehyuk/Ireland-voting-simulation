/**
 * STV 시각화 모듈을 제공한다.
 */
(function initializeStvVisualization() {
  /**
   * 시각화 상태를 보관한다.
   * @type {WeakMap<HTMLElement, {result: any, selectedCountIndex: number}>}
   */
  const visualizationStateMap = new WeakMap();

  /**
   * 시각화 전체를 렌더링한다.
   * @param {HTMLElement} container 렌더링 대상
   * @param {any} result STV 결과
   */
  function render(container, result) {
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const previousState = visualizationStateMap.get(container);
    const selectedCountIndex = Math.min(previousState?.selectedCountIndex ?? result.counts.length - 1, result.counts.length - 1);

    visualizationStateMap.set(container, {
      result,
      selectedCountIndex
    });

    draw(container);
  }

  /**
   * 내부 상태에 따라 시각화 DOM을 다시 그린다.
   * @param {HTMLElement} container 시각화 컨테이너
   */
  function draw(container) {
    const state = visualizationStateMap.get(container);
    if (!state) {
      container.innerHTML = "";
      return;
    }

    const { result, selectedCountIndex } = state;
    const selectedCount = result.counts[selectedCountIndex];

    container.innerHTML = `
      <section class="card border-0 shadow-sm stv-flow-shell">
        <div class="card-body">
          <div class="d-flex flex-column flex-xl-row justify-content-between gap-3 mb-3">
            <div>
              <div class="d-flex flex-wrap gap-2 align-items-center mb-2">
                <span class="badge text-bg-dark">Count Explorer</span>
                ${buildActionBadgeMarkup(selectedCount.action.type)}
              </div>
              <h4 class="h5 mb-1">Count ${selectedCount.countNumber}</h4>
              <p class="text-muted mb-0">${escapeHtml(selectedCount.action.description)}</p>
            </div>
            <div class="d-flex flex-wrap gap-2 align-items-start">
              <span class="badge text-bg-primary">이동 ${selectedCount.action.transferredVotes + selectedCount.action.exhaustedVotes}표</span>
              <span class="badge text-bg-secondary">소진 ${selectedCount.action.exhaustedVotes}표</span>
              <span class="badge text-bg-success">이번 count 당선 ${selectedCount.newlyElected.length}명</span>
            </div>
          </div>

          <div class="row g-2 align-items-center mb-3">
            <div class="col-12 col-lg-2 d-grid">
              <button type="button" class="btn btn-outline-secondary" data-visualization-nav="prev" ${selectedCountIndex === 0 ? "disabled" : ""}>이전 Count</button>
            </div>
            <div class="col-12 col-lg-8">
              <label for="visualization-count-range" class="form-label small text-muted mb-1">탐색 위치</label>
              <input
                id="visualization-count-range"
                type="range"
                class="form-range"
                min="0"
                max="${result.counts.length - 1}"
                step="1"
                value="${selectedCountIndex}"
                data-visualization-range="true"
              />
            </div>
            <div class="col-12 col-lg-2 d-grid">
              <button type="button" class="btn btn-outline-secondary" data-visualization-nav="next" ${selectedCountIndex === result.counts.length - 1 ? "disabled" : ""}>다음 Count</button>
            </div>
          </div>

          <div class="small text-muted mb-3">
            ${selectedCount.countNumber}/${result.counts.length}번째 count를 보고 있습니다.
            주체 후보: ${escapeHtml(resolveCandidateNameById(selectedCount.action.candidateId, result))}
          </div>

          <div class="row g-3">
            <div class="col-12 col-xl-8">
              <div class="border rounded-4 p-3 bg-white stv-flow-board">
                <div class="d-flex justify-content-between align-items-center mb-3">
                  <h5 class="h6 mb-0">표 이동 흐름</h5>
                </div>
                <svg class="stv-flow-svg" data-flow-svg="true" aria-hidden="true"></svg>
                <div class="vstack gap-2 stv-lane-list" data-lane-list="true">
                  ${buildLaneMarkup(result, selectedCount)}
                  ${buildExhaustedSinkMarkup(selectedCount)}
                </div>
              </div>
            </div>

            <div class="col-12 col-xl-4">
              <div class="border rounded-4 p-3 bg-white h-100">
                <h5 class="h6 mb-3">요약</h5>
                ${buildNarrativeMarkup(result, selectedCount)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="card border-0 shadow-sm">
        <div class="card-body">
          <div class="d-flex flex-column flex-lg-row justify-content-between gap-2 mb-3">
            <div>
              <h4 class="h5 mb-1">후보별 전체 Count 타임라인</h4>
              <p class="text-muted mb-0">각 칸은 count 종료 시점의 득표와 상태를 보여줍니다.</p>
            </div>
            <div class="small text-muted">선택된 count는 진하게 강조됩니다.</div>
          </div>
          <div class="vstack gap-3">
            ${buildTimelineMarkup(result, selectedCountIndex)}
          </div>
        </div>
      </section>
    `;

    bindVisualizationEvents(container);
    drawFlowArrows(container, result, selectedCount);
  }

  /**
   * 시각화 내부 이벤트를 연결한다.
   * @param {HTMLElement} container 컨테이너
   */
  function bindVisualizationEvents(container) {
    const rangeInput = container.querySelector("[data-visualization-range]");
    if (rangeInput instanceof HTMLInputElement) {
      rangeInput.addEventListener("input", () => {
        updateSelectedCountIndex(container, Number(rangeInput.value));
      });
    }

    container.querySelectorAll("[data-visualization-nav]").forEach((button) => {
      button.addEventListener("click", () => {
        if (!(button instanceof HTMLButtonElement)) {
          return;
        }

        const direction = button.getAttribute("data-visualization-nav");
        const state = visualizationStateMap.get(container);
        if (!state) {
          return;
        }

        const nextIndex = direction === "prev" ? state.selectedCountIndex - 1 : state.selectedCountIndex + 1;
        updateSelectedCountIndex(container, nextIndex);
      });
    });

    container.querySelectorAll("[data-select-count-index]").forEach((element) => {
      element.addEventListener("click", () => {
        const indexText = element.getAttribute("data-select-count-index");
        updateSelectedCountIndex(container, Number(indexText));
      });
    });
  }

  /**
   * 선택된 count 인덱스를 갱신한다.
   * @param {HTMLElement} container 컨테이너
   * @param {number} nextIndex 다음 인덱스
   */
  function updateSelectedCountIndex(container, nextIndex) {
    const state = visualizationStateMap.get(container);
    if (!state) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(nextIndex, state.result.counts.length - 1));
    visualizationStateMap.set(container, {
      ...state,
      selectedCountIndex: boundedIndex
    });
    draw(container);
  }

  /**
   * 후보 레인 마크업을 생성한다.
   * @param {any} result 전체 결과
   * @param {any} selectedCount 선택된 count
   * @returns {string} 마크업 문자열
   */
  function buildLaneMarkup(result, selectedCount) {
    const maxVotes = Math.max(...selectedCount.tallies.map((tally) => tally.votes), 1);
    const sourceCandidateId = selectedCount.action.candidateId;
    const transferTargetIds = new Set(selectedCount.action.transfers.map((transfer) => transfer.candidateId));

    return selectedCount.tallies
      .map((tally) => {
        const isFocus = tally.candidate.id === sourceCandidateId || transferTargetIds.has(tally.candidate.id);
        const laneClasses = [
          "stv-lane",
          "p-3",
          tally.status === "elected" ? "is-elected" : "",
          tally.status === "excluded" ? "is-excluded" : "",
          isFocus ? "is-focus" : "is-passive"
        ]
          .filter(Boolean)
          .join(" ");
        const fillWidth = Math.max(4, Math.round((tally.votes / maxVotes) * 100));
        const fillClass =
          tally.status === "elected" ? "stv-vote-fill is-elected" : tally.status === "excluded" ? "stv-vote-fill is-excluded" : "stv-vote-fill";

        return `
          <div class="${laneClasses}" data-candidate-lane="${tally.candidate.id}">
            <div class="d-flex flex-column flex-lg-row justify-content-between gap-2">
              <div>
                <div class="fw-semibold">${escapeHtml(tally.candidate.name)}</div>
                <div class="small text-muted">${escapeHtml(tally.candidate.party)}</div>
              </div>
              <div class="d-flex flex-wrap gap-2 align-items-center">
                <span class="badge text-bg-light border">${renderCandidateStatusText(tally)}</span>
                <span class="badge text-bg-dark">${tally.votes}표</span>
              </div>
            </div>
            <div class="stv-vote-bar mt-3">
              <div class="${fillClass}" style="width: ${fillWidth}%"></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  /**
   * 소진표 표시 영역을 생성한다.
   * @param {any} selectedCount 선택된 count
   * @returns {string} 마크업 문자열
   */
  function buildExhaustedSinkMarkup(selectedCount) {
    return `
      <div class="stv-sink-box p-3 ${selectedCount.action.exhaustedVotes > 0 ? "" : "opacity-75"}" data-exhausted-sink="true">
        <div class="fw-semibold">소진표</div>
        <div class="small text-muted">다음 선호를 찾지 못한 표가 이 영역으로 이동합니다.</div>
        <div class="mt-2">
          <span class="badge text-bg-secondary">${selectedCount.action.exhaustedVotes}표</span>
        </div>
      </div>
    `;
  }

  /**
   * 선택된 count에 대한 내러티브 마크업을 생성한다.
   * @param {any} result 전체 결과
   * @param {any} selectedCount 선택된 count
   * @returns {string} 마크업 문자열
   */
  function buildNarrativeMarkup(result, selectedCount) {
    const narrativeItems = [];

    if (selectedCount.action.type === "initial") {
      narrativeItems.push("모든 유효 투표지의 1순위 표를 집계했습니다.");
    }

    if (selectedCount.action.type === "surplus") {
      narrativeItems.push(
        `${resolveCandidateNameById(selectedCount.action.candidateId, result)}의 surplus ${selectedCount.action.surplus}표를 다음 선호 순서로 나눴습니다.`
      );
    }

    if (selectedCount.action.type === "exclusion") {
      narrativeItems.push(
        `${resolveCandidateNameById(selectedCount.action.candidateId, result)}를 탈락시키고 남은 선호 순위에 따라 표를 재배분했습니다.`
      );
    }

    if (selectedCount.action.type === "finalisation") {
      narrativeItems.push("남은 계속 후보 수가 잔여 의석 수와 같아 모두 당선 처리했습니다.");
    }

    selectedCount.action.transfers.forEach((transfer) => {
      narrativeItems.push(`${resolveCandidateNameById(transfer.candidateId, result)}에게 ${transfer.votes}표가 이동했습니다.`);
    });

    if (selectedCount.action.exhaustedVotes > 0) {
      narrativeItems.push(`${selectedCount.action.exhaustedVotes}표는 더 이상 유효한 다음 선호가 없어 소진되었습니다.`);
    }

    if (selectedCount.newlyElected.length > 0) {
      narrativeItems.push(`이번 count에서 ${selectedCount.newlyElected.map((candidate) => candidate.name).join(", ")} 후보가 새로 당선되었습니다.`);
    }

    if (narrativeItems.length === 0) {
      narrativeItems.push("이 count에서는 눈에 띄는 표 이동 없이 후보 상태만 유지되었습니다.");
    }

    return `
      <div class="vstack gap-2">
        ${narrativeItems
          .map(
            (text, index) => `
              <div class="border rounded-3 p-2 bg-body-tertiary">
                <div class="small text-muted">Step ${index + 1}</div>
                <div>${escapeHtml(text)}</div>
              </div>
            `
          )
          .join("")}
      </div>
    `;
  }

  /**
   * 후보별 count 타임라인 마크업을 생성한다.
   * @param {any} result 전체 결과
   * @param {number} selectedCountIndex 선택된 count 인덱스
   * @returns {string} 마크업 문자열
   */
  function buildTimelineMarkup(result, selectedCountIndex) {
    const candidateOrder = result.finalTallies.map((tally) => tally.candidate.id);
    const countsByCandidateId = new Map(candidateOrder.map((candidateId) => [candidateId, []]));

    result.counts.forEach((count, countIndex) => {
      count.tallies.forEach((tally) => {
        countsByCandidateId.get(tally.candidate.id)?.push({
          countIndex,
          countNumber: count.countNumber,
          votes: tally.votes,
          status: tally.status
        });
      });
    });

    return candidateOrder
      .map((candidateId) => {
        const finalTally = result.finalTallies.find((tally) => tally.candidate.id === candidateId);
        const candidateCounts = countsByCandidateId.get(candidateId) ?? [];

        return `
          <div class="border rounded-4 p-3">
            <div class="d-flex flex-column flex-lg-row justify-content-between gap-2 mb-3">
              <div>
                <div class="fw-semibold">${escapeHtml(finalTally.candidate.name)}</div>
                <div class="small text-muted">${escapeHtml(finalTally.candidate.party)}</div>
              </div>
              <div class="small text-muted">최종 상태: ${renderCandidateStatusText(finalTally)}</div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              ${candidateCounts
                .map((snapshot) => buildTimelineChipMarkup(snapshot, selectedCountIndex))
                .join("")}
            </div>
          </div>
        `;
      })
      .join("");
  }

  /**
   * 단일 타임라인 칩 마크업을 생성한다.
   * @param {{countIndex: number, countNumber: number, votes: number, status: string}} snapshot 스냅샷
   * @param {number} selectedCountIndex 선택된 count 인덱스
   * @returns {string} 마크업 문자열
   */
  function buildTimelineChipMarkup(snapshot, selectedCountIndex) {
    const classes = [
      "stv-mini-chip",
      "p-2",
      snapshot.status === "elected" ? "is-elected" : "",
      snapshot.status === "excluded" ? "is-excluded" : "",
      snapshot.countIndex === selectedCountIndex ? "border-primary border-2" : ""
    ]
      .filter(Boolean)
      .join(" ");

    return `
      <button type="button" class="${classes}" data-select-count-index="${snapshot.countIndex}">
        <div class="small text-muted">Count ${snapshot.countNumber}</div>
        <div class="fw-semibold">${snapshot.votes}표</div>
        <div class="small">${renderStatusLabel(snapshot.status)}</div>
      </button>
    `;
  }

  /**
   * 선택된 count의 화살표 흐름을 SVG로 그린다.
   * @param {HTMLElement} container 시각화 컨테이너
   * @param {any} result 전체 결과
   * @param {any} selectedCount 선택된 count
   */
  function drawFlowArrows(container, result, selectedCount) {
    const svg = container.querySelector("[data-flow-svg]");
    const board = container.querySelector(".stv-flow-board");
    const laneList = container.querySelector("[data-lane-list]");
    if (!(svg instanceof SVGSVGElement) || !(laneList instanceof HTMLElement) || !(board instanceof HTMLElement)) {
      return;
    }

    const boardRect = board.getBoundingClientRect();
    svg.setAttribute("viewBox", `0 0 ${Math.max(boardRect.width, 10)} ${Math.max(boardRect.height, 10)}`);
    svg.innerHTML = createSvgDefinitions();

    const sourceLane = selectedCount.action.candidateId
      ? container.querySelector(`[data-candidate-lane="${selectedCount.action.candidateId}"]`)
      : null;

    if (sourceLane instanceof HTMLElement) {
      selectedCount.action.transfers.forEach((transfer) => {
        const targetLane = container.querySelector(`[data-candidate-lane="${transfer.candidateId}"]`);
        if (!(targetLane instanceof HTMLElement)) {
          return;
        }

        const path = createArrowPath(
          getCenterPoint(sourceLane, boardRect),
          getCenterPoint(targetLane, boardRect),
          `rgba(13, 110, 253, ${Math.min(0.85, 0.3 + transfer.votes * 0.12)})`,
          String(2 + transfer.votes)
        );
        svg.insertAdjacentHTML("beforeend", path);
      });

      if (selectedCount.action.exhaustedVotes > 0) {
        const sink = container.querySelector("[data-exhausted-sink]");
        if (sink instanceof HTMLElement) {
          const path = createArrowPath(
            getCenterPoint(sourceLane, boardRect),
            getCenterPoint(sink, boardRect),
            "rgba(108, 117, 125, 0.8)",
            String(2 + selectedCount.action.exhaustedVotes)
          );
          svg.insertAdjacentHTML("beforeend", path);
        }
      }
    }
  }

  /**
   * SVG 정의 문자열을 생성한다.
   * @returns {string} 마크업 문자열
   */
  function createSvgDefinitions() {
    return `
      <defs>
        <marker id="stv-arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill="currentColor"></polygon>
        </marker>
      </defs>
    `;
  }

  /**
   * 중심 좌표를 계산한다.
   * @param {HTMLElement} element 대상 요소
   * @param {DOMRect} boardRect 보드 기준 사각형
   * @returns {{x: number, y: number}} 중심 좌표
   */
  function getCenterPoint(element, boardRect) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - boardRect.left + rect.width * 0.5,
      y: rect.top - boardRect.top + rect.height * 0.5
    };
  }

  /**
   * 화살표 경로를 생성한다.
   * @param {{x: number, y: number}} from 시작점
   * @param {{x: number, y: number}} to 끝점
   * @param {string} color 색상
   * @param {string} strokeWidth 선 굵기
   * @returns {string} SVG path 문자열
   */
  function createArrowPath(from, to, color, strokeWidth) {
    const adjustedFrom = { ...from };
    const adjustedTo = { ...to };
    const horizontalGap = adjustedTo.x - adjustedFrom.x;

    if (Math.abs(horizontalGap) < 24) {
      adjustedFrom.x += 18;
      adjustedTo.x += 18;
    }

    const curveOffset = Math.max(40, Math.abs(adjustedTo.x - adjustedFrom.x) * 0.35);
    const controlX = adjustedFrom.x + curveOffset;
    const secondControlX = adjustedTo.x - curveOffset;
    return `
      <path
        d="M ${adjustedFrom.x} ${adjustedFrom.y} C ${controlX} ${adjustedFrom.y}, ${secondControlX} ${adjustedTo.y}, ${adjustedTo.x} ${adjustedTo.y}"
        fill="none"
        stroke="${color}"
        stroke-width="${strokeWidth}"
        stroke-linecap="round"
        marker-end="url(#stv-arrowhead)"
        style="color:${color}"
      ></path>
    `;
  }

  /**
   * 작업 유형 배지 마크업을 생성한다.
   * @param {string} actionType 작업 유형
   * @returns {string} 배지 마크업
   */
  function buildActionBadgeMarkup(actionType) {
    const badgeMap = {
      initial: '<span class="badge text-bg-primary">초기 집계</span>',
      surplus: '<span class="badge text-bg-warning">Surplus 이양</span>',
      exclusion: '<span class="badge text-bg-danger">후보 탈락</span>',
      finalisation: '<span class="badge text-bg-success">최종 확정</span>'
    };

    return badgeMap[actionType] ?? '<span class="badge text-bg-secondary">기타</span>';
  }

  /**
   * 후보 상태를 짧은 라벨로 변환한다.
   * @param {string} status 상태 문자열
   * @returns {string} 상태 라벨
   */
  function renderStatusLabel(status) {
    if (status === "elected") {
      return "당선";
    }
    if (status === "excluded") {
      return "탈락";
    }
    return "계속";
  }

  /**
   * 결과 객체에서 후보 ID를 이름으로 변환한다.
   * @param {string | null} candidateId 후보 ID
   * @param {any} result 전체 결과
   * @returns {string} 후보 이름
   */
  function resolveCandidateNameById(candidateId, result) {
    if (!candidateId) {
      return "전체 집계";
    }

    const tally = result.finalTallies.find((item) => item.candidate.id === candidateId);
    return tally ? `${tally.candidate.name} (${tally.candidate.party})` : candidateId;
  }

  /**
   * 후보 상태 문구를 생성한다.
   * @param {{status: string, reachedQuota?: boolean, exceededQuota?: boolean}} tally 후보 정보
   * @returns {string} 상태 문구
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
   * HTML 특수문자를 이스케이프한다.
   * @param {string} value 문자열
   * @returns {string} 이스케이프 결과
   */
  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  window.StvVisualization = {
    render
  };
})();
