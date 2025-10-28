class GeminiComponent extends HTMLElement {
  static API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

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
          width: 800px;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          min-height: 200px;
          position: relative;
        }
        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          font-weight: 500;
          color: #333;
          border-radius: 0.5rem;
          z-index: 20;
        }
        .spinner {
          border: 4px solid rgba(0, 0, 0, .1);
          border-left-color: #2563eb;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .tabs { display: flex; margin-top: 0rem; border-bottom: 1px solid #d1d5db; }
        .tab { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid transparent; border-bottom: none; margin-bottom: -1px; }
        .tab.active { border-color: #d1d5db; border-bottom-color: white; border-radius: 0.375rem 0.375rem 0 0; background-color: white; }
        .tab-content { display: none; border: 1px solid #d1d5db; border-top: none; padding: 0; border-radius: 0 0 0.375rem 0.375rem; }
        .tab-content#code { padding: 1rem; }
        .tab-content#preview { overflow: hidden; border-radius: 0 0 0.375rem 0.375rem; height: 800px; }
        .tab-content.active { display: block; }
        .code-area { display: flex; flex-direction: column; gap: 1rem; }
        .output-box {
          position: relative;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background-color: #f9fafb;
          overflow: hidden;
        }
        h3 { display: none; }
        .code-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #f3f4f6;
          padding: 0.5rem 1rem;
          border-bottom: 1px solid #d1d5db;
          font-family: Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.875rem;
          color: #374151;
        }
        .file-name {
          font-weight: 500;
        }
        pre {
          background-color: #f9fafb;
          padding: 1rem;
          border-radius: 0;
          max-height: 300px;
          overflow-y: auto;
          white-space: pre-wrap;
          word-wrap: break-word;
          margin: 0;
          border-top: none;
        }
        .copy-btn {
          position: relative;
          top: auto; right: auto;
          padding: 0.25rem;
          background-color: #e5e7eb;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          transition: background-color 0.2s;
        }
        .copy-btn:hover { background-color: #d1d5db; }
        .copy-btn svg { width: 16px; height: 16px; fill: #374151; }
        .copy-feedback {
          position: absolute;
          top: 0.5rem;
          right: 3.25rem;
          background-color: #333;
          color: white;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
          pointer-events: none;
          white-space: nowrap;
          z-index: 30;
        }
        .copy-feedback.show { opacity: 1; }
        #preview-output {
            width: 100%;
            height: 800px;
            border: none;
            border-radius: 0 0 0.375rem 0.375rem;
            display: block;
        }
        #error-display { color: #ef4444; font-weight: 500; padding: 1rem; }
        .hidden { display: none !important; }
      </style>
      <div class="container">
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="spinner"></div>
          <div>UIを生成中...</div>
        </div>

        <div id="error-display" class="hidden"></div>

        <div id="output-container" class="hidden">
          <div class="tabs">
            <div class="tab active" data-tab="code">コード</div>
            <div class="tab" data-tab="preview">プレビュー</div>
          </div>

          <div id="code" class="tab-content active">
            <div class="code-area">
              <div class="output-box">
                <div class="code-header">
                  <span class="file-name">index.html</span>
                  <div style="position: relative;">
                    <button class="copy-btn" data-target="html-output" aria-label="HTMLコードをコピー">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                    </button>
                    <div class="copy-feedback" data-for="html-output">コピーしました</div>
                  </div>
                </div>
                <pre><code id="html-output"></code></pre>
              </div>
              <div class="output-box">
                <div class="code-header">
                  <span class="file-name">style.css</span>
                    <div style="position: relative;">
                      <button class="copy-btn" data-target="css-output" aria-label="CSSコードをコピー">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                      </button>
                      <div class="copy-feedback" data-for="css-output">コピーしました</div>
                    </div>
                </div>
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
    codeArea: '.code-area',
    htmlOutput: '#html-output',
    cssOutput: '#css-output',
    previewOutput: '#preview-output',
    copyButtons: '.copy-btn',
    tabs: '.tab',
    tabContents: '.tab-content',
  };

  #apiKey = null;
  #requestPrompt = null; // 新しい属性
  #originalHtml = ''; // 子要素のHTML
  #elements = {};
  #abortController = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(GeminiComponent.TEMPLATE.content.cloneNode(true));

    for (const key in GeminiComponent.SELECTORS) {
      const element = this.shadowRoot.querySelectorAll(GeminiComponent.SELECTORS[key]);
      this.#elements[key] = element.length > 1 ? Array.from(element) : element[0];
    }
  }

  connectedCallback() {
    this.#apiKey = this.getAttribute('api-key');
    this.#requestPrompt = this.getAttribute('request');
    this.#originalHtml = this.innerHTML.trim(); // 子要素のHTMLを取得

    if (!this.#apiKey) {
      console.error('GeminiComponent: "api-key" attribute is required.');
      this.#updateUIState('ERROR', { message: 'APIキーが設定されていません。' });
      return; // APIキーがない場合は処理を中断
    }
    if (!this.#requestPrompt) {
      console.error('GeminiComponent: "request" attribute is required.');
      this.#updateUIState('ERROR', { message: 'UIの要望("request"属性)が設定されていません。' });
      return; // リクエストがない場合は処理を中断
    }

    this.#addEventListeners();
    this.#processRequest(); // 初期ロード時にAPIリクエストを実行
  }

  disconnectedCallback() {
    this.#removeEventListeners();
    this.#abortController?.abort();
  }

  #addEventListeners() {
    this.#elements.copyButtons.forEach(btn => btn.addEventListener('click', this.#handleCopy));
    this.#elements.tabs.forEach(tab => tab.addEventListener('click', () => this.#switchTab(tab.dataset.tab)));
  }

  #removeEventListeners() {
    this.#elements.copyButtons.forEach(btn => btn.removeEventListener('click', this.#handleCopy));
    // タブのイベントリスナーは静的なので、DOMから外れる時に削除する必要は薄いですが、厳密には削除すべき
    this.#elements.tabs.forEach(tab => tab.removeEventListener('click', () => this.#switchTab(tab.dataset.tab)));
  }

  #updateUIState(state, payload = {}) {
    const { loadingOverlay, outputContainer, errorDisplay, htmlOutput, cssOutput, previewOutput } = this.#elements;

    loadingOverlay.classList.add('hidden');
    outputContainer.classList.add('hidden');
    errorDisplay.classList.add('hidden');

    switch (state) {
      case 'LOADING':
        loadingOverlay.classList.remove('hidden');
        break;

      case 'ERROR':
        errorDisplay.classList.remove('hidden');
        errorDisplay.textContent = `エラー: ${payload.message}`;
        outputContainer.classList.add('hidden'); // エラー時は結果を非表示に
        break;

      case 'SUCCESS':
        outputContainer.classList.remove('hidden');
        const { html, css } = payload;
        htmlOutput.textContent = html;
        cssOutput.textContent = css;
        previewOutput.srcdoc = this.#createPreviewDoc(html, css);
        this.#switchTab('code'); // 成功時はコードタブをデフォルトにする
        break;
    }
  }

  #processRequest = async () => {
    this.#updateUIState('LOADING');
    this.#abortController = new AbortController();

    try {
      const prompt = this.#buildPrompt(this.#originalHtml, this.#requestPrompt);
      const responseText = await this.#callGeminiApi(prompt, this.#abortController.signal);

      if (!responseText) throw new Error("APIから空の応答がありました。");

      const jsonResponse = JSON.parse(responseText);

      if (typeof jsonResponse.html !== 'string' || typeof jsonResponse.css !== 'string') {
        throw new Error("APIの応答が期待したJSON形式ではありません。");
      }
      this.#updateUIState('SUCCESS', jsonResponse);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("処理中にエラーが発生しました:", error);
        this.#updateUIState('ERROR', { message: error.message });
      }
    } finally {
      this.#abortController = null;
    }
  };

  #handleCopy = (event) => {
    const button = event.currentTarget;
    const targetId = button.dataset.target;
    const codeElement = this.shadowRoot.querySelector(`#${targetId}`);
    if (!codeElement) return;

    const textToCopy = codeElement.textContent;
    const feedbackElement = button.closest('[style*="position: relative"]').querySelector(`.copy-feedback[data-for="${targetId}"]`);

    navigator.clipboard.writeText(textToCopy).then(() => {
      feedbackElement.classList.add('show');
      setTimeout(() => feedbackElement.classList.remove('show'), 2000);
    }).catch(err => {
      console.error('コピーに失敗しました', err);
    });
  };

  #switchTab = (tabName) => {
    this.#elements.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    this.#elements.tabContents.forEach(content => content.classList.toggle('active', content.id === tabName));
  };

  async #callGeminiApi(prompt, signal) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    };
    const url = `${GeminiComponent.API_BASE_URL}?key=${this.#apiKey}`;
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

  #buildPrompt(html, request) {
    const htmlContent = html
      ? `対象HTML: ${html}`
      : `対象HTML: (なし。指示に基づき新規生成)`;

    return `
      あなたはモダンなUIを生成するエキスパートです。指示と対象HTMLに基づき、HTMLとCSSを生成します。

      【ルール】
      1. HTML: セマンティックHTMLとA11y (ARIAロール) を使用。
      2. CSS: モダン、レスポンシブ (メディアクエリ)、自己完結 (外部ライブラリ/リソース禁止)。
      3. 禁止: <script>, インラインイベント (onclick), 外部リソース (url(), @import)。

      【出力形式 (JSON)】
      - 必須キー: "html" (文字列), "css" (文字列)。
      - JSONオブジェクトのみを回答。説明やMarkdownコードブロックは不要。

      【入力】
      指示: ${request}
      ${htmlContent}
    `;
  }

  #createPreviewDoc(html, css) {
    return `
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: sans-serif; }
          ${css}
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
  }
}

customElements.define('gen-ui', GeminiComponent);