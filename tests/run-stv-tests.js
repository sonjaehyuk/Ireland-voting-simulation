const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const { runStvElection } = require("../js/stv-engine.js");

/**
 * 시나리오 디렉터리의 JSON 파일 목록을 반환한다.
 * @returns {string[]} 파일 경로 배열
 */
function listScenarioFiles() {
  const scenarioDir = path.join(__dirname, "..", "scenarios");
  return fs
    .readdirSync(scenarioDir)
    .filter((fileName) => fileName.endsWith(".json"))
    .sort()
    .map((fileName) => path.join(scenarioDir, fileName));
}

/**
 * 시나리오 JSON을 읽는다.
 * @param {string} filePath 파일 경로
 * @returns {any} 시나리오 객체
 */
function readScenario(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

/**
 * 시나리오를 엔진 입력으로 변환한다.
 * @param {any} scenario 시나리오 데이터
 * @returns {{candidates: any[], ballots: any[], seatCount: number}} 변환 결과
 */
function buildElectionInput(scenario) {
  const candidates = scenario.candidates.map((candidate, index) => ({
    id: `C-${String(index + 1).padStart(4, "0")}`,
    key: candidate.key,
    name: candidate.name,
    party: candidate.party
  }));

  const candidateIdByKey = new Map(candidates.map((candidate) => [candidate.key, candidate.id]));
  const ballots = scenario.ballots.map((ballotKeys, ballotIndex) => ({
    id: `B-${String(ballotIndex + 1).padStart(4, "0")}`,
    preferences: ballotKeys.map((candidateKey, preferenceIndex) => ({
      rank: preferenceIndex + 1,
      candidateId: candidateIdByKey.get(candidateKey)
    }))
  }));

  return {
    candidates: candidates.map(({ key, ...candidate }) => candidate),
    ballots,
    seatCount: scenario.seatCount
  };
}

/**
 * 득표 이양 정보를 후보 이름 기반으로 비교 가능한 형태로 변환한다.
 * @param {any} result STV 결과
 * @param {any} count 검증할 count
 * @returns {{candidate: string, votes: number}[]} 변환 결과
 */
function mapTransfersToCandidateNames(result, count) {
  const candidateNameById = new Map(result.finalTallies.map((tally) => [tally.candidate.id, tally.candidate.name]));
  return count.action.transfers.map((transfer) => ({
    candidate: candidateNameById.get(transfer.candidateId) ?? transfer.candidateId,
    votes: transfer.votes
  }));
}

/**
 * 단일 시나리오를 검증한다.
 * @param {string} filePath 시나리오 파일 경로
 */
function verifyScenario(filePath) {
  const scenario = readScenario(filePath);
  const input = buildElectionInput(scenario);
  const result = runStvElection(input.ballots, input.candidates, input.seatCount);
  const expected = scenario.expected;

  assert.equal(result.droopQuota, expected.quota, `${scenario.name}: quota 불일치`);
  assert.deepEqual(
    result.electedCandidates.map((candidate) => candidate.name),
    expected.elected,
    `${scenario.name}: 당선자 목록 불일치`
  );
  assert.deepEqual(
    result.counts.map((count) => count.action.type),
    expected.countTypes,
    `${scenario.name}: count 작업 순서 불일치`
  );
  assert.equal(result.counts.length, expected.countCount, `${scenario.name}: count 수 불일치`);

  if (Array.isArray(expected.excluded)) {
    assert.deepEqual(
      result.excludedCandidates.map((candidate) => candidate.name),
      expected.excluded,
      `${scenario.name}: 탈락 후보 목록 불일치`
    );
  }

  if (Array.isArray(expected.countAssertions)) {
    expected.countAssertions.forEach((assertion) => {
      const count = result.counts.find((item) => item.countNumber === assertion.countNumber);
      assert.ok(count, `${scenario.name}: count ${assertion.countNumber}를 찾을 수 없음`);
      assert.equal(count.action.type, assertion.actionType, `${scenario.name}: count ${assertion.countNumber} actionType 불일치`);

      if (typeof assertion.exhaustedVotes === "number") {
        assert.equal(
          count.action.exhaustedVotes,
          assertion.exhaustedVotes,
          `${scenario.name}: count ${assertion.countNumber} exhaustedVotes 불일치`
        );
      }

      if (Array.isArray(assertion.transfers)) {
        assert.deepEqual(
          mapTransfersToCandidateNames(result, count),
          assertion.transfers,
          `${scenario.name}: count ${assertion.countNumber} transfer 불일치`
        );
      }
    });
  }

  console.log(`[PASS] ${scenario.name}`);
}

/**
 * 전체 시나리오 테스트를 실행한다.
 */
function main() {
  const scenarioFiles = listScenarioFiles();
  if (scenarioFiles.length === 0) {
    throw new Error("검증할 시나리오 파일이 없습니다.");
  }

  scenarioFiles.forEach(verifyScenario);
  console.log(`총 ${scenarioFiles.length}개 시나리오를 통과했습니다.`);
}

main();
