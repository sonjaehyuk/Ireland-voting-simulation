/**
 * README 문서를 markdown-it으로 렌더링한다.
 */
(function initializeReadmeRenderer() {
  /** @type {HTMLElement | null} */
  const readmeContainer = document.querySelector("#readme-container");
  /** @type {HTMLDivElement | null} */
  const readmeFeedback = document.querySelector("#readme-feedback");

  if (!(readmeContainer instanceof HTMLElement) || !(readmeFeedback instanceof HTMLDivElement)) {
    return;
  }

  loadReadme();

  /**
   * README 파일을 불러와 렌더링한다.
   */
  async function loadReadme() {
    try {
      if (typeof window.markdownit !== "function") {
        throw new Error("마크다운 렌더러 라이브러리를 불러오지 못했습니다.");
      }

      const response = await fetch("./README.md");
      if (!response.ok) {
        throw new Error(`README.md를 불러오지 못했습니다. (${response.status})`);
      }

      const markdown = await response.text();
      const markdownRenderer = window.markdownit({
        html: false,
        linkify: true,
        breaks: false,
        typographer: false
      });

      readmeContainer.innerHTML = markdownRenderer.render(markdown);
      hideFeedback();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "README.md를 렌더링할 수 없습니다.");
    }
  }

  /**
   * 오류 피드백을 표시한다.
   * @param {string} message 메시지
   */
  function showFeedback(message) {
    readmeFeedback.textContent = message;
    readmeFeedback.classList.remove("d-none");
    readmeFeedback.classList.remove("alert-secondary");
    readmeFeedback.classList.add("alert-danger");
  }

  /**
   * 오류 피드백을 숨긴다.
   */
  function hideFeedback() {
    readmeFeedback.textContent = "";
    readmeFeedback.classList.add("d-none");
    readmeFeedback.classList.remove("alert-danger");
    readmeFeedback.classList.add("alert-secondary");
  }
})();
