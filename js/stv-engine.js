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
 * @typedef {"continuing" | "elected" | "excluded"} CandidateStatus
 */

/**
 * @typedef {"original" | "surplus" | "exclusion"} ParcelType
 */

/**
 * @typedef {Object} BallotState
 * @property {string} id 투표지 ID
 * @property {Preference[]} preferences 정렬된 선호도 목록
 * @property {string | null} currentCandidateId 현재 배정 후보 ID
 * @property {boolean} exhausted 소진 여부
 */

/**
 * @typedef {Object} CandidateParcel
 * @property {number} countNumber 해당 묶음이 생성된 count 번호
 * @property {ParcelType} type 묶음 생성 유형
 * @property {string | null} sourceCandidateId 표를 보낸 후보 ID
 * @property {string[]} ballotIds 묶음에 포함된 투표지 ID 배열
 */

/**
 * @typedef {Object} CandidateTally
 * @property {Candidate} candidate 후보 정보
 * @property {number} votes 현재 득표수
 * @property {CandidateStatus} status 후보 상태
 * @property {boolean} reachedQuota quota 이상 여부
 * @property {boolean} exceededQuota quota 초과 여부
 */

/**
 * @typedef {Object} CountTransfer
 * @property {string} candidateId 표를 받은 후보 ID
 * @property {number} votes 이양된 표 수
 */

/**
 * @typedef {Object} StvCountAction
 * @property {"initial" | "surplus" | "exclusion" | "finalisation"} type count 작업 유형
 * @property {string} description 작업 설명
 * @property {string | null} candidateId 주체 후보 ID
 * @property {number} transferredVotes 총 이양표 수
 * @property {number} exhaustedVotes 소진표 수
 * @property {number} surplus 잉여표 수
 * @property {CountTransfer[]} transfers 후보별 이양 내역
 */

/**
 * @typedef {Object} StvCountResult
 * @property {number} countNumber count 번호
 * @property {StvCountAction} action 수행된 작업
 * @property {CandidateTally[]} tallies count 종료 시점 득표 현황
 * @property {Candidate[]} newlyElected 이번 count에서 새로 확정된 당선자
 * @property {Candidate[]} continuingCandidates 계속 후보 목록
 * @property {Candidate[]} excludedCandidates 탈락 후보 목록
 */

/**
 * @typedef {Object} StvElectionResult
 * @property {number} seatCount 선출 의석 수
 * @property {number} totalBallots 총 투표지 수
 * @property {number} validBallots 유효 투표지 수
 * @property {number} invalidBallots 무효 투표지 수
 * @property {number} droopQuota Droop quota 값
 * @property {Candidate[]} electedCandidates 당선자 목록
 * @property {Candidate[]} excludedCandidates 탈락 후보 목록
 * @property {CandidateTally[]} finalTallies 최종 득표 현황
 * @property {StvCountResult[]} counts count 이력
 */

/**
 * STV 전체 집계를 수행한다.
 * @param {BallotPaper[]} ballots 투표지 목록
 * @param {Candidate[]} candidates 후보 목록
 * @param {number} seatCount 선출 의석 수
 * @returns {StvElectionResult} 최종 집계 결과
 */
function runStvElection(ballots, candidates, seatCount) {
  validateElectionInputs(ballots, candidates, seatCount);

  const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const ballotStateMap = new Map();
  const candidateBallots = createCandidateCollectionMap(candidates, () => []);
  const candidateParcels = createCandidateCollectionMap(candidates, () => []);
  const candidateStatuses = createCandidateCollectionMap(candidates, () => "continuing");
  const originalVoteMap = createCandidateCollectionMap(candidates, () => 0);
  const electedOrder = [];
  const counts = [];
  const processedSurplusKeys = new Set();
  let invalidBallots = 0;

  ballots.forEach((ballot) => {
    validateBallotPaper(ballot, candidateMap);

    const ballotState = {
      id: ballot.id,
      preferences: [...ballot.preferences].sort((a, b) => a.rank - b.rank),
      currentCandidateId: null,
      exhausted: false
    };

    ballotStateMap.set(ballot.id, ballotState);

    const firstPreference = findNextAvailablePreference(ballotState, candidateStatuses);
    if (!firstPreference) {
      ballotState.exhausted = true;
      invalidBallots += 1;
      return;
    }

    ballotState.currentCandidateId = firstPreference.candidateId;
    candidateBallots.get(firstPreference.candidateId).push(ballotState.id);
    originalVoteMap.set(firstPreference.candidateId, (originalVoteMap.get(firstPreference.candidateId) ?? 0) + 1);
  });

  const validBallots = ballots.length - invalidBallots;
  if (validBallots <= 0) {
    throw new Error("유효표가 없어 Droop quota를 계산할 수 없습니다.");
  }

  const droopQuota = calculateDroopQuota(validBallots, seatCount);

  candidates.forEach((candidate) => {
    const assignedBallotIds = [...candidateBallots.get(candidate.id)];
    if (assignedBallotIds.length > 0) {
      candidateParcels.get(candidate.id).push({
        countNumber: 1,
        type: "original",
        sourceCandidateId: null,
        ballotIds: assignedBallotIds
      });
    }
  });

  const initialNewlyElected = markReachedQuotaCandidates(
    candidates,
    candidateStatuses,
    candidateBallots,
    droopQuota,
    electedOrder,
    [],
    originalVoteMap
  );

  counts.push(
    createCountResult(
      1,
      {
        type: "initial",
        description: "1순위 표를 집계했습니다.",
        candidateId: null,
        transferredVotes: 0,
        exhaustedVotes: invalidBallots,
        surplus: 0,
        transfers: []
      },
      candidates,
      candidateStatuses,
      candidateBallots,
      droopQuota,
      candidateMap,
      initialNewlyElected
    )
  );

  let currentCountNumber = 1;

  while (electedOrder.length < seatCount) {
    const remainingSeats = seatCount - electedOrder.length;
    const continuingCandidates = getCandidatesByStatus(candidates, candidateStatuses, "continuing");

    if (continuingCandidates.length === 0) {
      break;
    }

    if (continuingCandidates.length <= remainingSeats) {
      const newlyElected = [];
      continuingCandidates.forEach((candidate) => {
        candidateStatuses.set(candidate.id, "elected");
        electedOrder.push(candidate.id);
        newlyElected.push(candidate);
      });

      currentCountNumber += 1;
      counts.push(
        createCountResult(
          currentCountNumber,
          {
            type: "finalisation",
            description: "남은 계속 후보 수가 잔여 의석 수와 같아 전원을 당선 처리했습니다.",
            candidateId: null,
            transferredVotes: 0,
            exhaustedVotes: 0,
            surplus: 0,
            transfers: []
          },
          candidates,
          candidateStatuses,
          candidateBallots,
          droopQuota,
          candidateMap,
          newlyElected
        )
      );
      break;
    }

    const surplusCandidateId = selectNextSurplusCandidate(
      candidates,
      candidateStatuses,
      candidateBallots,
      candidateParcels,
      droopQuota,
      originalVoteMap,
      counts,
      ballotStateMap,
      processedSurplusKeys
    );

    if (surplusCandidateId) {
      currentCountNumber += 1;

      const action = transferSurplus(
        surplusCandidateId,
        currentCountNumber,
        candidateStatuses,
        candidateBallots,
        candidateParcels,
        ballotStateMap,
        droopQuota,
        candidateMap,
        processedSurplusKeys
      );

      const newlyElected = markReachedQuotaCandidates(
        candidates,
        candidateStatuses,
        candidateBallots,
        droopQuota,
        electedOrder,
        counts,
        originalVoteMap
      );

      counts.push(
        createCountResult(
          currentCountNumber,
          action,
          candidates,
          candidateStatuses,
          candidateBallots,
          droopQuota,
          candidateMap,
          newlyElected
        )
      );
      continue;
    }

    const candidateToExcludeId = selectLowestCandidateForExclusion(
      candidates,
      candidateStatuses,
      candidateBallots,
      originalVoteMap,
      counts
    );

    if (!candidateToExcludeId) {
      break;
    }

    currentCountNumber += 1;

    const exclusionAction = excludeCandidate(
      candidateToExcludeId,
      currentCountNumber,
      candidateStatuses,
      candidateBallots,
      candidateParcels,
      ballotStateMap,
      candidateMap
    );

    const newlyElected = markReachedQuotaCandidates(
      candidates,
      candidateStatuses,
      candidateBallots,
      droopQuota,
      electedOrder,
      counts,
      originalVoteMap
    );

    counts.push(
      createCountResult(
        currentCountNumber,
        exclusionAction,
        candidates,
        candidateStatuses,
        candidateBallots,
        droopQuota,
        candidateMap,
        newlyElected
      )
    );
  }

  return {
    seatCount,
    totalBallots: ballots.length,
    validBallots,
    invalidBallots,
    droopQuota,
    electedCandidates: electedOrder.map((candidateId) => candidateMap.get(candidateId)).filter(Boolean),
    excludedCandidates: getCandidatesByStatus(candidates, candidateStatuses, "excluded"),
    finalTallies: buildTallies(candidates, candidateStatuses, candidateBallots, droopQuota, candidateMap),
    counts
  };
}

/**
 * 선거 입력값을 검증한다.
 * @param {BallotPaper[]} ballots 투표지 목록
 * @param {Candidate[]} candidates 후보 목록
 * @param {number} seatCount 의석 수
 */
function validateElectionInputs(ballots, candidates, seatCount) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error("집계를 위해 최소 1명 이상의 후보가 필요합니다.");
  }

  if (!Array.isArray(ballots) || ballots.length === 0) {
    throw new Error("집계를 위해 최소 1개의 투표지가 필요합니다.");
  }

  validateSeatCount(seatCount, candidates.length);
}

/**
 * 후보 기반 컬렉션 맵을 생성한다.
 * @template T
 * @param {Candidate[]} candidates 후보 목록
 * @param {() => T} factory 초기값 생성 함수
 * @returns {Map<string, T>} 후보별 맵
 */
function createCandidateCollectionMap(candidates, factory) {
  const collectionMap = new Map();
  candidates.forEach((candidate) => {
    collectionMap.set(candidate.id, factory());
  });
  return collectionMap;
}

/**
 * quota 도달 후보를 당선 처리한다.
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 ID 목록
 * @param {number} droopQuota quota 값
 * @param {string[]} electedOrder 당선 순서 ID 배열
 * @param {StvCountResult[]} counts 이전 count 목록
 * @param {Map<string, number>} originalVoteMap 원득표 맵
 * @returns {Candidate[]} 새로 당선된 후보 목록
 */
function markReachedQuotaCandidates(
  candidates,
  candidateStatuses,
  candidateBallots,
  droopQuota,
  electedOrder,
  counts,
  originalVoteMap
) {
  const continuingCandidates = candidates.filter((candidate) => candidateStatuses.get(candidate.id) === "continuing");
  const newlyElected = continuingCandidates
    .filter((candidate) => (candidateBallots.get(candidate.id) ?? []).length >= droopQuota)
    .sort((left, right) =>
      compareCandidatesByVotesDesc(
        left.id,
        right.id,
        candidateBallots,
        createCountHistorySnapshot(counts),
        originalVoteMap,
        candidates
      )
    );

  newlyElected.forEach((candidate) => {
    candidateStatuses.set(candidate.id, "elected");
    electedOrder.push(candidate.id);
  });

  return newlyElected;
}

/**
 * 다음 surplus 이양 후보를 선택한다.
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 ID 목록
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @param {number} droopQuota quota 값
 * @param {Map<string, number>} originalVoteMap 원득표 맵
 * @param {StvCountResult[]} counts count 이력
 * @param {Map<string, BallotState>} ballotStateMap 투표지 상태 맵
 * @param {Set<string>} processedSurplusKeys 처리 완료 surplus 키 집합
 * @returns {string | null} surplus 처리 대상 후보 ID
 */
function selectNextSurplusCandidate(
  candidates,
  candidateStatuses,
  candidateBallots,
  candidateParcels,
  droopQuota,
  originalVoteMap,
  counts,
  ballotStateMap,
  processedSurplusKeys
) {
  const countSnapshots = createCountHistorySnapshot(counts);
  const eligible = candidates
    .filter((candidate) => candidateStatuses.get(candidate.id) === "elected")
    .filter((candidate) => {
      const surplus = (candidateBallots.get(candidate.id) ?? []).length - droopQuota;
      if (surplus <= 0) {
        return false;
      }
      if (processedSurplusKeys.has(createSurplusProcessingKey(candidate.id, candidateParcels, candidateBallots))) {
        return false;
      }
      return canDistributeSurplus(
        candidate.id,
        candidates,
        candidateStatuses,
        candidateBallots,
        candidateParcels,
        droopQuota,
        ballotStateMap
      );
    });

  if (eligible.length === 0) {
    return null;
  }

  eligible.sort((left, right) => {
    const leftSurplus = (candidateBallots.get(left.id) ?? []).length - droopQuota;
    const rightSurplus = (candidateBallots.get(right.id) ?? []).length - droopQuota;
    if (leftSurplus !== rightSurplus) {
      return rightSurplus - leftSurplus;
    }

    const historicalOrder = compareHistoricalVotes(right.id, left.id, countSnapshots);
    if (historicalOrder !== 0) {
      return historicalOrder;
    }

    const originalDifference = (originalVoteMap.get(right.id) ?? 0) - (originalVoteMap.get(left.id) ?? 0);
    if (originalDifference !== 0) {
      return originalDifference;
    }

    return compareCandidateOrder(left.id, right.id, candidates);
  });

  return eligible[0]?.id ?? null;
}

/**
 * surplus 이양 가능 여부를 판단한다.
 * @param {string} candidateId 후보 ID
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 ID 목록
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @param {number} droopQuota quota 값
 * @param {Map<string, BallotState>} ballotStateMap 투표지 상태 맵
 * @returns {boolean} 이양 가능 여부
 */
function canDistributeSurplus(
  candidateId,
  candidates,
  candidateStatuses,
  candidateBallots,
  candidateParcels,
  droopQuota,
  ballotStateMap
) {
  const surplus = (candidateBallots.get(candidateId) ?? []).length - droopQuota;
  if (surplus <= 0) {
    return false;
  }

  const parcel = getSurplusSourceParcel(candidateId, candidateParcels);
  if (!parcel || parcel.ballotIds.length === 0) {
    return false;
  }

  const hasTransferablePaper = parcel.ballotIds.some((ballotId) => {
    const ballotState = ballotStateMap.get(ballotId);
    if (!ballotState || ballotState.currentCandidateId !== candidateId || ballotState.exhausted) {
      return false;
    }
    return Boolean(findNextAvailablePreference(ballotState, candidateStatuses, candidateId));
  });

  if (!hasTransferablePaper) {
    return false;
  }

  const continuingCandidates = candidates
    .filter((candidate) => candidateStatuses.get(candidate.id) === "continuing")
    .map((candidate) => ({ id: candidate.id, votes: (candidateBallots.get(candidate.id) ?? []).length }))
    .sort((left, right) => left.votes - right.votes);

  if (continuingCandidates.length === 0) {
    return false;
  }

  const highestContinuing = continuingCandidates[continuingCandidates.length - 1];
  if (highestContinuing.votes + surplus >= droopQuota) {
    return true;
  }

  if (continuingCandidates.length >= 2) {
    const lowest = continuingCandidates[0];
    const secondLowest = continuingCandidates[1];
    if (lowest.votes + surplus >= secondLowest.votes) {
      return true;
    }
  }

  return false;
}

/**
 * surplus 원천 묶음을 반환한다.
 * @param {string} candidateId 후보 ID
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @returns {CandidateParcel | undefined} 원천 묶음
 */
function getSurplusSourceParcel(candidateId, candidateParcels) {
  const parcels = candidateParcels.get(candidateId) ?? [];
  if (parcels.length === 0) {
    return undefined;
  }

  const latestParcel = parcels[parcels.length - 1];
  if (latestParcel.type === "original") {
    return {
      ...latestParcel,
      ballotIds: parcels.flatMap((parcel) => parcel.ballotIds)
    };
  }

  return latestParcel;
}

/**
 * surplus를 다른 후보에게 이양한다.
 * @param {string} candidateId surplus 후보 ID
 * @param {number} countNumber 현재 count 번호
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 ID 목록
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @param {Map<string, BallotState>} ballotStateMap 투표지 상태 맵
 * @param {number} droopQuota quota 값
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 * @param {Set<string>} processedSurplusKeys 처리 완료 surplus 키 집합
 * @returns {StvCountAction} 수행 결과
 */
function transferSurplus(
  candidateId,
  countNumber,
  candidateStatuses,
  candidateBallots,
  candidateParcels,
  ballotStateMap,
  droopQuota,
  candidateMap,
  processedSurplusKeys
) {
  const sourceParcel = getSurplusSourceParcel(candidateId, candidateParcels);
  if (!sourceParcel) {
    throw new Error("surplus를 계산할 기준 표 묶음을 찾을 수 없습니다.");
  }

  processedSurplusKeys.add(createSurplusProcessingKey(candidateId, candidateParcels, candidateBallots));

  const surplus = (candidateBallots.get(candidateId) ?? []).length - droopQuota;
  const transferableGroups = new Map();
  const nonTransferableBallotIds = [];

  [...sourceParcel.ballotIds]
    .sort()
    .forEach((ballotId) => {
      const ballotState = ballotStateMap.get(ballotId);
      if (!ballotState || ballotState.currentCandidateId !== candidateId || ballotState.exhausted) {
        return;
      }

      const nextPreference = findNextAvailablePreference(ballotState, candidateStatuses, candidateId);
      if (!nextPreference) {
        nonTransferableBallotIds.push(ballotId);
        return;
      }

      const group = transferableGroups.get(nextPreference.candidateId) ?? [];
      group.push(ballotId);
      transferableGroups.set(nextPreference.candidateId, group);
    });

  const totalTransferablePapers = Array.from(transferableGroups.values()).reduce(
    (sum, ballotIds) => sum + ballotIds.length,
    0
  );

  if (totalTransferablePapers === 0) {
    return {
      type: "surplus",
      description: `${candidateMap.get(candidateId)?.name ?? candidateId} 후보 surplus를 검토했지만 이양 가능한 다음 선호가 없습니다.`,
      candidateId,
      transferredVotes: 0,
      exhaustedVotes: 0,
      surplus,
      transfers: []
    };
  }

  const transfers = allocateSurplusTransfers(transferableGroups, surplus, candidateBallots, candidateMap);
  let transferredVotes = 0;

  transfers.forEach((transfer) => {
    const recipientBallots = candidateBallots.get(transfer.candidateId) ?? [];
    const newParcelBallotIds = transfer.ballotIds;

    newParcelBallotIds.forEach((ballotId) => {
      removeBallotFromCandidate(candidateBallots, candidateId, ballotId);
      const ballotState = ballotStateMap.get(ballotId);
      if (ballotState) {
        ballotState.currentCandidateId = transfer.candidateId;
      }
      recipientBallots.push(ballotId);
    });

    candidateBallots.set(transfer.candidateId, recipientBallots);
    candidateParcels.get(transfer.candidateId).push({
      countNumber,
      type: "surplus",
      sourceCandidateId: candidateId,
      ballotIds: [...newParcelBallotIds]
    });
    transferredVotes += newParcelBallotIds.length;
  });

  const candidateVotes = candidateBallots.get(candidateId) ?? [];
  let exhaustedVotes = 0;
  const excessNonTransferable = Math.max(0, candidateVotes.length - droopQuota);
  if (excessNonTransferable > 0) {
    const removableBallotIds = [...nonTransferableBallotIds].sort().slice(0, excessNonTransferable);
    removableBallotIds.forEach((ballotId) => {
      removeBallotFromCandidate(candidateBallots, candidateId, ballotId);
      const ballotState = ballotStateMap.get(ballotId);
      if (ballotState) {
        ballotState.currentCandidateId = null;
        ballotState.exhausted = true;
      }
    });
    exhaustedVotes = removableBallotIds.length;
  }

  return {
    type: "surplus",
    description: `${candidateMap.get(candidateId)?.name ?? candidateId} 후보 surplus ${surplus}표를 다음 선호로 이양했습니다.`,
    candidateId,
    transferredVotes,
    exhaustedVotes,
    surplus,
    transfers: transfers.map((transfer) => ({
      candidateId: transfer.candidateId,
      votes: transfer.ballotIds.length
    }))
  };
}

/**
 * 후보의 surplus 처리 상태 식별 키를 생성한다.
 * @param {string} candidateId 후보 ID
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @returns {string} 식별 키
 */
function createSurplusProcessingKey(candidateId, candidateParcels, candidateBallots) {
  const sourceParcel = getSurplusSourceParcel(candidateId, candidateParcels);
  if (!sourceParcel) {
    return `${candidateId}:none`;
  }
  return [
    candidateId,
    sourceParcel.countNumber,
    sourceParcel.type,
    sourceParcel.sourceCandidateId ?? "root",
    sourceParcel.ballotIds.length,
    candidateBallots.get(candidateId)?.length ?? 0
  ].join(":");
}

/**
 * surplus 배분량을 계산한다.
 * @param {Map<string, string[]>} transferableGroups 후보별 transferable 묶음
 * @param {number} surplus surplus 표 수
 * @param {Map<string, string[]>} candidateBallots 후보별 현재 투표지 맵
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 * @returns {{candidateId: string, ballotIds: string[]}[]} 배분 결과
 */
function allocateSurplusTransfers(transferableGroups, surplus, candidateBallots, candidateMap) {
  const totalTransferable = Array.from(transferableGroups.values()).reduce((sum, ballotIds) => sum + ballotIds.length, 0);

  if (surplus >= totalTransferable) {
    return Array.from(transferableGroups.entries()).map(([candidateId, ballotIds]) => ({
      candidateId,
      ballotIds: [...ballotIds]
    }));
  }

  const quotaShares = Array.from(transferableGroups.entries()).map(([candidateId, ballotIds]) => {
    const rawShare = (ballotIds.length * surplus) / totalTransferable;
    return {
      candidateId,
      ballotIds: [...ballotIds].sort(),
      baseCount: Math.floor(rawShare),
      remainder: rawShare - Math.floor(rawShare),
      parcelSize: ballotIds.length,
      originalVotes: candidateBallots.get(candidateId)?.length ?? 0,
      candidateName: candidateMap.get(candidateId)?.name ?? candidateId
    };
  });

  let allocated = quotaShares.reduce((sum, share) => sum + share.baseCount, 0);
  const remaining = surplus - allocated;

  quotaShares
    .sort((left, right) => {
      if (left.remainder !== right.remainder) {
        return right.remainder - left.remainder;
      }
      if (left.parcelSize !== right.parcelSize) {
        return right.parcelSize - left.parcelSize;
      }
      if (left.originalVotes !== right.originalVotes) {
        return right.originalVotes - left.originalVotes;
      }
      return left.candidateName.localeCompare(right.candidateName, "ko");
    })
    .forEach((share, index) => {
      share.baseCount += index < remaining ? 1 : 0;
    });

  allocated += remaining;
  if (allocated !== surplus) {
    throw new Error("surplus 배분 수량이 quota와 일치하지 않습니다.");
  }

  return quotaShares
    .filter((share) => share.baseCount > 0)
    .map((share) => ({
      candidateId: share.candidateId,
      ballotIds: share.ballotIds.slice(0, share.baseCount)
    }));
}

/**
 * 최저 득표 후보를 선택한다.
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {Map<string, number>} originalVoteMap 원득표 맵
 * @param {StvCountResult[]} counts count 이력
 * @returns {string | null} 탈락 후보 ID
 */
function selectLowestCandidateForExclusion(candidates, candidateStatuses, candidateBallots, originalVoteMap, counts) {
  const continuing = candidates.filter((candidate) => candidateStatuses.get(candidate.id) === "continuing");
  if (continuing.length === 0) {
    return null;
  }

  continuing.sort((left, right) => {
    const voteDifference = (candidateBallots.get(left.id)?.length ?? 0) - (candidateBallots.get(right.id)?.length ?? 0);
    if (voteDifference !== 0) {
      return voteDifference;
    }

    const originalDifference = (originalVoteMap.get(left.id) ?? 0) - (originalVoteMap.get(right.id) ?? 0);
    if (originalDifference !== 0) {
      return originalDifference;
    }

    const historicalDifference = compareHistoricalVotes(left.id, right.id, createCountHistorySnapshot(counts));
    if (historicalDifference !== 0) {
      return historicalDifference;
    }

    return compareCandidateOrder(left.id, right.id, candidates);
  });

  return continuing[0]?.id ?? null;
}

/**
 * 후보를 탈락시키고 표를 재배분한다.
 * @param {string} candidateId 탈락 후보 ID
 * @param {number} countNumber 현재 count 번호
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {Map<string, CandidateParcel[]>} candidateParcels 후보별 묶음 목록
 * @param {Map<string, BallotState>} ballotStateMap 투표지 상태 맵
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 * @returns {StvCountAction} 탈락 처리 결과
 */
function excludeCandidate(
  candidateId,
  countNumber,
  candidateStatuses,
  candidateBallots,
  candidateParcels,
  ballotStateMap,
  candidateMap
) {
  candidateStatuses.set(candidateId, "excluded");

  const ballotIds = [...(candidateBallots.get(candidateId) ?? [])].sort();
  const transferGroups = new Map();
  let exhaustedVotes = 0;

  ballotIds.forEach((ballotId) => {
    const ballotState = ballotStateMap.get(ballotId);
    if (!ballotState) {
      return;
    }

    const nextPreference = findNextAvailablePreference(ballotState, candidateStatuses);
    removeBallotFromCandidate(candidateBallots, candidateId, ballotId);

    if (!nextPreference) {
      ballotState.currentCandidateId = null;
      ballotState.exhausted = true;
      exhaustedVotes += 1;
      return;
    }

    ballotState.currentCandidateId = nextPreference.candidateId;
    const recipientBallots = candidateBallots.get(nextPreference.candidateId) ?? [];
    recipientBallots.push(ballotId);
    candidateBallots.set(nextPreference.candidateId, recipientBallots);

    const group = transferGroups.get(nextPreference.candidateId) ?? [];
    group.push(ballotId);
    transferGroups.set(nextPreference.candidateId, group);
  });

  transferGroups.forEach((recipientBallotIds, recipientId) => {
    candidateParcels.get(recipientId).push({
      countNumber,
      type: "exclusion",
      sourceCandidateId: candidateId,
      ballotIds: [...recipientBallotIds]
    });
  });

  return {
    type: "exclusion",
    description: `${candidateMap.get(candidateId)?.name ?? candidateId} 후보를 탈락시키고 표를 재배분했습니다.`,
    candidateId,
    transferredVotes: ballotIds.length - exhaustedVotes,
    exhaustedVotes,
    surplus: 0,
    transfers: Array.from(transferGroups.entries()).map(([recipientId, recipientBallotIds]) => ({
      candidateId: recipientId,
      votes: recipientBallotIds.length
    }))
  };
}

/**
 * 다음 유효 선호를 찾는다.
 * @param {BallotState} ballotState 투표지 상태
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {string | null} ignoredCandidateId 건너뛸 후보 ID
 * @returns {Preference | undefined} 다음 선호
 */
function findNextAvailablePreference(ballotState, candidateStatuses, ignoredCandidateId = null) {
  return ballotState.preferences.find((preference) => {
    if (preference.candidateId === ignoredCandidateId) {
      return false;
    }
    return candidateStatuses.get(preference.candidateId) === "continuing";
  });
}

/**
 * count 결과 객체를 생성한다.
 * @param {number} countNumber count 번호
 * @param {StvCountAction} action 작업 정보
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {number} droopQuota quota 값
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 * @param {Candidate[]} newlyElected 새 당선자 목록
 * @returns {StvCountResult} count 결과
 */
function createCountResult(
  countNumber,
  action,
  candidates,
  candidateStatuses,
  candidateBallots,
  droopQuota,
  candidateMap,
  newlyElected
) {
  return {
    countNumber,
    action,
    tallies: buildTallies(candidates, candidateStatuses, candidateBallots, droopQuota, candidateMap),
    newlyElected,
    continuingCandidates: getCandidatesByStatus(candidates, candidateStatuses, "continuing"),
    excludedCandidates: getCandidatesByStatus(candidates, candidateStatuses, "excluded")
  };
}

/**
 * 후보별 득표 현황을 생성한다.
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {number} droopQuota quota 값
 * @param {Map<string, Candidate>} candidateMap 후보 맵
 * @returns {CandidateTally[]} 득표 현황 목록
 */
function buildTallies(candidates, candidateStatuses, candidateBallots, droopQuota, candidateMap) {
  return candidates
    .map((candidate) => {
      const votes = (candidateBallots.get(candidate.id) ?? []).length;
      return {
        candidate: candidateMap.get(candidate.id) ?? candidate,
        votes,
        status: candidateStatuses.get(candidate.id) ?? "continuing",
        reachedQuota: votes >= droopQuota,
        exceededQuota: votes > droopQuota
      };
    })
    .sort((left, right) => {
      if (right.votes !== left.votes) {
        return right.votes - left.votes;
      }
      return left.candidate.name.localeCompare(right.candidate.name, "ko");
    });
}

/**
 * 특정 상태의 후보를 반환한다.
 * @param {Candidate[]} candidates 후보 목록
 * @param {Map<string, CandidateStatus>} candidateStatuses 후보 상태 맵
 * @param {CandidateStatus} status 찾을 상태
 * @returns {Candidate[]} 해당 상태 후보 목록
 */
function getCandidatesByStatus(candidates, candidateStatuses, status) {
  return candidates.filter((candidate) => candidateStatuses.get(candidate.id) === status);
}

/**
 * 역사적 득표를 기준으로 후보 우선순위를 비교한다.
 * @param {string} leftCandidateId 좌측 후보 ID
 * @param {string} rightCandidateId 우측 후보 ID
 * @param {Array<Map<string, number>>} snapshots count 스냅샷 목록
 * @returns {number} 비교 결과
 */
function compareHistoricalVotes(leftCandidateId, rightCandidateId, snapshots) {
  for (let index = 0; index < snapshots.length; index += 1) {
    const snapshot = snapshots[index];
    const leftVotes = snapshot.get(leftCandidateId) ?? 0;
    const rightVotes = snapshot.get(rightCandidateId) ?? 0;
    if (leftVotes !== rightVotes) {
      return leftVotes - rightVotes;
    }
  }
  return 0;
}

/**
 * count 이력을 득표 스냅샷 목록으로 변환한다.
 * @param {StvCountResult[]} counts count 이력
 * @returns {Array<Map<string, number>>} 득표 스냅샷 목록
 */
function createCountHistorySnapshot(counts) {
  return counts.map((count) => new Map(count.tallies.map((tally) => [tally.candidate.id, tally.votes])));
}

/**
 * 후보 등록 순서를 기준으로 비교한다.
 * @param {string} leftCandidateId 좌측 후보 ID
 * @param {string} rightCandidateId 우측 후보 ID
 * @param {Candidate[]} candidates 후보 목록
 * @returns {number} 비교 결과
 */
function compareCandidateOrder(leftCandidateId, rightCandidateId, candidates) {
  const leftIndex = candidates.findIndex((candidate) => candidate.id === leftCandidateId);
  const rightIndex = candidates.findIndex((candidate) => candidate.id === rightCandidateId);
  return leftIndex - rightIndex;
}

/**
 * 현재 득표수를 기준으로 내림차순 비교한다.
 * @param {string} leftCandidateId 좌측 후보 ID
 * @param {string} rightCandidateId 우측 후보 ID
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {Array<Map<string, number>>} countSnapshots count 스냅샷 목록
 * @param {Map<string, number>} originalVoteMap 원득표 맵
 * @param {Candidate[]} candidates 후보 목록
 * @returns {number} 비교 결과
 */
function compareCandidatesByVotesDesc(
  leftCandidateId,
  rightCandidateId,
  candidateBallots,
  countSnapshots,
  originalVoteMap,
  candidates
) {
  const leftVotes = candidateBallots.get(leftCandidateId)?.length ?? 0;
  const rightVotes = candidateBallots.get(rightCandidateId)?.length ?? 0;
  if (leftVotes !== rightVotes) {
    return rightVotes - leftVotes;
  }

  const historicalDifference = compareHistoricalVotes(rightCandidateId, leftCandidateId, countSnapshots);
  if (historicalDifference !== 0) {
    return historicalDifference;
  }

  const originalDifference = (originalVoteMap.get(rightCandidateId) ?? 0) - (originalVoteMap.get(leftCandidateId) ?? 0);
  if (originalDifference !== 0) {
    return originalDifference;
  }

  return compareCandidateOrder(leftCandidateId, rightCandidateId, candidates);
}

/**
 * 후보의 현재 투표지 목록에서 특정 투표지를 제거한다.
 * @param {Map<string, string[]>} candidateBallots 후보별 투표지 맵
 * @param {string} candidateId 후보 ID
 * @param {string} ballotId 제거할 투표지 ID
 */
function removeBallotFromCandidate(candidateBallots, candidateId, ballotId) {
  const ballotIds = candidateBallots.get(candidateId) ?? [];
  const index = ballotIds.indexOf(ballotId);
  if (index >= 0) {
    ballotIds.splice(index, 1);
  }
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

if (typeof window !== "undefined") {
  window.StvEngine = {
    runStvElection
  };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    runStvElection
  };
}
