class GenerativeUi extends HTMLElement {
  // 1. 定数

  static API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  static COPY_ICON_SVG = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
    </svg>
  `;

  static TEMPLATE = (() => {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          padding: 1.5rem;
          max-width: 800px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          min-height: 200px;
          position: relative;
        }
        .loading-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 1rem; font-weight: 500; color: #333;
          border-radius: 0.5rem; z-index: 20;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, .1);
          border-left-color: #2563eb;
          border-radius: 50%;
          width: 36px; height: 36px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tabs { display: flex; border-bottom: 1px solid #d1d5db; }
        .tab { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid transparent; border-bottom: none; margin-bottom: -1px; }
        .tab.active { border-color: #d1d5db; border-bottom-color: white; border-radius: 0.375rem 0.375rem 0 0; background-color: white; }
        .tab-content { display: none; border: 1px solid #d1d5db; border-top: none; padding: 1rem; border-radius: 0 0 0.375rem 0.375rem; }
        .tab-content.active { display: block; }
        .code-area { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        .output-box { position: relative; }
        h3 { margin-top: 0; }
        pre { background-color: #f3f4f6; padding: 1rem; border-radius: 0.375rem; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; }
        .copy-btn { position: absolute; top: 0.5rem; right: 0.5rem; padding: 0.25rem; background-color: #e5e7eb; border: 1px solid #d1d5db; border-radius: 0.25rem; cursor: pointer; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; transition: background-color 0.2s; z-index: 10; }
        .copy-btn:hover { background-color: #d1d5db; }
        .copy-btn svg { width: 16px; height: 16px; }
        .copy-feedback { position: absolute; top: 0.5rem; right: 38px; background-color: #333; color: white; padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; opacity: 0; transition: opacity 0.3s ease-in-out; pointer-events: none; white-space: nowrap; }
        .copy-feedback.show { opacity: 1; }

        #preview-output {
          width: 100%;
          height: 100vh;
          border: none;
        }

        #error-display { color: #ef4444; font-weight: 500; padding: 1rem; }
        .hidden { display: none !important; }

        #response-time-display {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
          background-color: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          z-index: 10;
        }
      </style>
      <div class="container">
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="spinner"></div>
          <div>UIを生成中...</div>
        </div>
        <div id="error-display" class="hidden"></div>
        <div id="output-container" class="hidden">
          <div id="response-time-display"></div>
          <div class="tabs">
            <div class="tab active" data-tab="code">コード</div>
            <div class="tab" data-tab="preview">プレビュー</div>
          </div>
          <div id="code" class="tab-content active">
            <div class="code-area">
              <div class="output-box">
                <h3>HTML</h3>
                <button class="copy-btn" data-target="html-output" aria-label="HTMLコードをコピー">
                  ${GenerativeUi.COPY_ICON_SVG}
                </button>
                <div class="copy-feedback" data-for="html-output">コピーしました</div>
                <pre><code id="html-output"></code></pre>
              </div>
              <div class="output-box">
                <h3>CSS</h3>
                <button class="copy-btn" data-target="css-output" aria-label="CSSコードをコピー">
                  ${GenerativeUi.COPY_ICON_SVG}
                </button>
                <div class="copy-feedback" data-for="css-output">コピーしました</div>
                <pre><code id="css-output"></code></pre>
              </div>
            </div>
          </div>
          <div id="preview" class="tab-content">
            <iframe id="preview-output" title="生成されたUIのプレビュー"></iframe>
          </div>
        </div>
      </div>
    `;
    return template;
  })();

  static SELECTORS = {
    loadingOverlay: '#loading-overlay',
    errorDisplay: '#error-display',
    outputContainer: '#output-container',
    htmlOutput: '#html-output',
    cssOutput: '#css-output',
    previewOutput: '#preview-output',
    copyButtons: '.copy-btn',
    tabs: '.tab',
    tabContents: '.tab-content',
    responseTimeDisplay: '#response-time-display',
  };

  static CLASSES = {
    ACTIVE: 'active',
    HIDDEN: 'hidden',
    SHOW: 'show',
  }

  static UI_STATES = {
    LOADING: 'LOADING',
    SUCCESS: 'SUCCESS',
    ERROR: 'ERROR',
  };

  // 2. プライベートプロパティ

  #apiKey = null;
  #requestPrompt = null;
  #originalHtml = '';
  #elements = {};
  #abortController = null;

  // 3. ライフサイクル

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(GenerativeUi.TEMPLATE.content.cloneNode(true));
    this.#cacheElements();
  }

  connectedCallback() {
    this.#initializeProperties();

    if (this.#validateAttributes()) {
      this.#addEventListeners();
      this.#processRequest();
    }
  }

  disconnectedCallback() {
    this.#removeEventListeners();
    this.#abortController?.abort();
  }

  // 4. イベントハンドラ

  #handleCopy = async(event) => {
    const button = event.currentTarget;
    const targetId = button.dataset.target;
    const codeElement = this.shadowRoot.querySelector(`#${targetId}`);
    if (!codeElement) return;

    const feedbackElement = this.shadowRoot.querySelector(`.copy-feedback[data-for="${targetId}"]`);

    try {
      await navigator.clipboard.writeText(codeElement.textContent);
      feedbackElement.classList.add(GenerativeUi.CLASSES.SHOW);
      setTimeout(() => feedbackElement.classList.remove(GenerativeUi.CLASSES.SHOW), 2000);
    } catch (err) {
      console.error('コピーに失敗しました: ', err);
    }
  };

  #handleTabClick = (event) => {
    const tabName = event.currentTarget.dataset.tab;
    this.#switchTab(tabName);
  }

  // 5. コアロジック

  #processRequest = async () => {
    this.#updateUIState(GenerativeUi.UI_STATES.LOADING);
    this.#abortController = new AbortController();

    const startTime = performance.now();

    try {
      const prompt = this.#buildPrompt(this.#originalHtml, this.#requestPrompt);
      const responseText = await this.#callGeminiApi(prompt, this.#abortController.signal);
      const jsonResponse = this.#parseApiResponse(responseText);

      this.#updateUIState(GenerativeUi.UI_STATES.SUCCESS, jsonResponse);
    } catch (error) {
      if (error.name !== 'AboutError') {
        console.error("処理中にエラーが発生しました:", error);
        this.#updateUIState(GenerativeUi.UI_STATES.ERROR, { message: error.message });
      }
    } finally {
      const endTime = performance.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      if (this.#elements.responseTimeDisplay) {
        this.#elements.responseTimeDisplay.textContent = `応答速度: ${duration}秒`;
      }
      this.#abortController = null;
    }
  }

  async #callGeminiApi(prompt, signal) {
    const url = `${GenerativeUi.API_BASE_URL}?key=${this.#apiKey}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 1,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`APIエラー (${response.status}): ${errorData?.error?.message || '不明なエラー'}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  #parseApiResponse(responseText) {
    if (!responseText) {
      throw new Error("APIは空のレスポンスを返しました。")
    }

    try {
      const jsonResponse = JSON.parse(responseText);
      if (typeof jsonResponse.html !== 'string' || typeof jsonResponse.css !== 'string') {
        throw new Error("APIからのJSONフォーマットが無効です。「html」と「css」のキーが必要です。")
      }
      return jsonResponse;
    } catch (error) {
      console.error("APIレスポンスの解析に失敗しました: ", responseText);
      throw new Error("APIからの応答を解析できませんでした。")
    }
  }

  // 6. UI操作

  #updateUIState(state, payload = {}) {
    const { loadingOverlay, outputContainer, errorDisplay, htmlOutput, cssOutput, previewOutput, responseTimeDisplay } = this.#elements;
    const { HIDDEN } = GenerativeUi.CLASSES;

    loadingOverlay.classList.add(HIDDEN)
    outputContainer.classList.add(HIDDEN);
    errorDisplay.classList.add(HIDDEN);

    if (responseTimeDisplay) {
      responseTimeDisplay.classList.add(HIDDEN);
    }

    switch (state) {
      case GenerativeUi.UI_STATES.LOADING:
        loadingOverlay.classList.remove(HIDDEN);
        break;

      case GenerativeUi.UI_STATES.ERROR:
        errorDisplay.textContent = `エラー: ${payload.message}`;
        errorDisplay.classList.remove(HIDDEN);
        if (responseTimeDisplay) {
          responseTimeDisplay.classList.remove(HIDDEN);
        }
        break;

      case GenerativeUi.UI_STATES.SUCCESS:
        const { html, css } = payload;
        htmlOutput.textContent = html;
        cssOutput.textContent = css;
        previewOutput.srcdoc = this.#createPreviewDoc(html, css);
        outputContainer.classList.remove(HIDDEN);
        this.#switchTab('code');
        if (responseTimeDisplay) {
          responseTimeDisplay.classList.remove(HIDDEN);
        }
        break;
    }
  }

  #switchTab = (tabName) => {
    const { ACTIVE } = GenerativeUi.CLASSES;
    this.#elements.tabs.forEach(tab => tab.classList.toggle(ACTIVE, tab.dataset.tab === tabName));
    this.#elements.tabContents.forEach(content => content.classList.toggle(ACTIVE, content.id === tabName));
  };

  // 7. ヘルパー

  #cacheElements() {
    for (const key in GenerativeUi.SELECTORS) {
      const elements = this.shadowRoot.querySelectorAll(GenerativeUi.SELECTORS[key]);
      this.#elements[key] = elements.length > 1 ? Array.from(elements) : elements[0];
    }
  }

  #initializeProperties() {
    this.#apiKey = this.getAttribute('api-key');
    this.#requestPrompt = this.getAttribute('request');
    this.#originalHtml = this.innerHTML.trim();
  }

  #validateAttributes() {
    if (!this.#apiKey) {
      this.#updateUIState(GenerativeUi.UI_STATES.ERROR, { message: '「api-key」属性が必要です。'});
      return false;
    }
    if (!this.#requestPrompt) {
      this.#updateUIState(GenerativeUi.UI_STATES.ERROR, { message: '「request」属性が必要です。'});
      return false;
    }
    if (!this.#originalHtml) {
      this.#updateUIState(GenerativeUi.UI_STATES.ERROR, { message: 'HTMLの子要素が必要です。'});
      return false;
    }
    return true;
  }

  #addEventListeners() {
    this.#elements.copyButtons.forEach(btn => btn.addEventListener('click', this.#handleCopy));
    this.#elements.tabs.forEach(tab => tab.addEventListener('click', this.#handleTabClick));
  }

  #removeEventListeners() {
    this.#elements.copyButtons.forEach(btn => btn.removeEventListener('click', this.#handleCopy));
    this.#elements.tabs.forEach(tab => tab.removeEventListener('click', this.#handleTabClick));
  }

  #buildPrompt(html, request) {
    return `
      あなたはプロのフロントエンジニアです。
      入力としてユーザーからの指示と、変更対象となるHTMLを受け取ります。
      あなたはその指示に従って、新しいHTMLと、そのHTMLを装飾するためのCSSコードを生成してください。
      出力は以下のルールに厳密に従ってください
      - 回答は必ずJSON形式でなければなりません。
      - JSONオブジェクトは 'html' と 'css' の2つのキーを持つ必要があります。
      - 'html' の値は変更後のHTMLコード（文字列）です。
      - 'css' の値は生成されたCSSコード（文字列）です。
      - JSONを囲む\`\`\`jsonや\`\`\`のようなMarkdownのコードブロック識別子を絶対に含めないでください。
      - 回答には純粋なJSONオブジェクトのみとしてください。説明や他のテキストは一切不要です。
      ユーザーからの指示: ${request}
      対象のHTML: ${html}
    `;
  }

  #createPreviewDoc(html, css) {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>body { font-family: sans-serif; } ${css}</style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
  }
}

customElements.define('gen-ui', GenerativeUi);