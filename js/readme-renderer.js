/**
 * README 문서를 간단한 HTML로 렌더링한다.
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
      const response = await fetch("./README.md");
      if (!response.ok) {
        throw new Error(`README.md를 불러오지 못했습니다. (${response.status})`);
      }

      const markdown = await response.text();
      readmeContainer.innerHTML = renderMarkdown(markdown);
      hideFeedback();
    } catch (error) {
      showFeedback(error instanceof Error ? error.message : "README.md를 렌더링할 수 없습니다.");
    }
  }

  /**
   * 최소한의 마크다운 문법을 HTML로 변환한다.
   * @param {string} markdown 마크다운 문자열
   * @returns {string} HTML 문자열
   */
  function renderMarkdown(markdown) {
    const lines = markdown.replaceAll("\r\n", "\n").split("\n");
    const htmlParts = [];
    let index = 0;
    let inCodeBlock = false;
    let paragraphLines = [];
    let listItems = [];

    while (index < lines.length) {
      const line = lines[index];

      if (line.startsWith("```")) {
        flushParagraph();
        flushList();

        if (!inCodeBlock) {
          inCodeBlock = true;
          htmlParts.push("<pre><code>");
        } else {
          inCodeBlock = false;
          htmlParts.push("</code></pre>");
        }

        index += 1;
        continue;
      }

      if (inCodeBlock) {
        htmlParts.push(`${escapeHtml(line)}\n`);
        index += 1;
        continue;
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        flushParagraph();
        flushList();
        const level = headingMatch[1].length;
        htmlParts.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
        index += 1;
        continue;
      }

      const listMatch = line.match(/^- (.*)$/);
      if (listMatch) {
        flushParagraph();
        listItems.push(`<li>${renderInlineMarkdown(listMatch[1])}</li>`);
        index += 1;
        continue;
      }

      if (!line.trim()) {
        flushParagraph();
        flushList();
        index += 1;
        continue;
      }

      paragraphLines.push(line.trim());
      index += 1;
    }

    flushParagraph();
    flushList();

    return htmlParts.join("");

    /**
     * 문단을 플러시한다.
     */
    function flushParagraph() {
      if (paragraphLines.length === 0) {
        return;
      }

      const paragraph = paragraphLines.join(" ");
      htmlParts.push(`<p>${renderInlineMarkdown(paragraph)}</p>`);
      paragraphLines = [];
    }

    /**
     * 리스트를 플러시한다.
     */
    function flushList() {
      if (listItems.length === 0) {
        return;
      }

      htmlParts.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  }

  /**
   * 인라인 마크다운을 변환한다.
   * @param {string} text 텍스트
   * @returns {string} HTML 문자열
   */
  function renderInlineMarkdown(text) {
    return escapeHtml(text)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
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
