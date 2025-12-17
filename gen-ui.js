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

        /* --- Tabs & Save Button --- */
        .tabs-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #d1d5db;
        }
        .tabs { display: flex; }
        .tab { padding: 0.5rem 1rem; cursor: pointer; border: 1px solid transparent; border-bottom: none; margin-bottom: -1px; }
        .tab.active { border-color: #d1d5db; border-bottom-color: white; border-radius: 0.375rem 0.375rem 0 0; background-color: white; }

        /* --- Tab Content --- */
        .tab-content { display: none; border: 1px solid #d1d5db; border-top: none; padding: 0; border-radius: 0 0 0.375rem 0.375rem; }
        .tab-content#code { padding: 1rem; }
        .tab-content#preview { overflow: hidden; border-radius: 0 0 0.375rem 0.375rem; height: 800px; }
        .tab-content.active { display: block; }

        /* --- Code Area --- */
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

        /* Info Display Update */
        #info-display {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 1rem;
          font-size: 0.875rem;
          color: #6b7280;
          padding: 0 1.5rem 0.5rem;
          margin-top: -1rem;
          margin-bottom: 0.5rem;
        }
        .key-badge {
          background-color: #e0f2fe;
          color: #0369a1;
          padding: 2px 8px;
          border-radius: 4px;
          font-family: monospace;
          font-weight: bold;
          border: 1px solid #bae6fd;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        .key-badge:hover {
          background-color: #bae6fd;
        }

        .hidden { display: none !important; }
      </style>
      <div class="container">
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="spinner"></div>
          <div id="loading-text">UIを生成中...</div>
        </div>

        <div id="error-display" class="hidden"></div>

        <div id="info-display" class="hidden"></div>

        <div id="output-container" class="hidden">
          <div class="tabs-toolbar">
            <div class="tabs">
              <div class="tab active" data-tab="code">コード</div>
              <div class="tab" data-tab="preview">プレビュー</div>
            </div>
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
    loadingText: '#loading-text',
    errorDisplay: '#error-display',
    infoDisplay: '#info-display',
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
  #requestPrompt = null;
  #originalHtml = '';
  #collection = null;
  #loadKey = null;
  #saveKey = null;
  #elements = {};
  #abortController = null;

  #generatedHtml = null;
  #generatedCss = null;
  #generatedTitle = null;

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
    this.#collection = this.getAttribute('collection');
    this.#loadKey = this.getAttribute('load-key');
    this.#saveKey = this.getAttribute('save-key');
    this.#originalHtml = this.innerHTML.trim();

    if (!this.#apiKey) {
      console.error('GeminiComponent: "api-key" attribute is required.');
      this.#updateUIState('ERROR', { message: 'APIキーが設定されていません。' });
      return;
    }

    // load-key がある場合は読み込みモード、なければ生成モード
    if (this.#loadKey && this.#collection) {
      this.#addEventListeners();
      this.#loadFromFirestore();
    } else {
      if (!this.#requestPrompt) {
        console.error('GeminiComponent: "request" attribute is required.');
        this.#updateUIState('ERROR', { message: 'UIの要望("request"属性)が設定されていません。' });
        return;
      }
      this.#addEventListeners();
      this.#processRequest();
    }
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
    this.#elements.tabs.forEach(tab => tab.removeEventListener('click', () => this.#switchTab(tab.dataset.tab)));
  }

  #updateUIState(state, payload = {}) {
    const { loadingOverlay, loadingText, outputContainer, errorDisplay, infoDisplay, htmlOutput, cssOutput, previewOutput } = this.#elements;

    // 既存の表示をクリア
    loadingOverlay.classList.add('hidden');
    outputContainer.classList.add('hidden');
    errorDisplay.classList.add('hidden');
    infoDisplay.classList.add('hidden');
    infoDisplay.innerHTML = ''; // テキストではなくHTMLをクリア

    // 内部データをリセット (SUCCESS以外)
    if (state !== 'SUCCESS') {
        this.#generatedHtml = null;
        this.#generatedCss = null;
        this.#generatedTitle = null;
    }

    const { durationMs, savedKey } = payload;
    const durationText = durationMs ? ` (応答時間: ${(durationMs / 1000).toFixed(2)}秒)` : '';

    switch (state) {
      case 'LOADING':
        loadingOverlay.classList.remove('hidden');
        loadingText.textContent = payload.message || 'UIを生成中...';
        break;

      case 'ERROR':
        errorDisplay.classList.remove('hidden');
        errorDisplay.textContent = `エラー: ${payload.message}${durationText}`;
        outputContainer.classList.add('hidden');
        break;

      case 'SUCCESS':
        outputContainer.classList.remove('hidden');
        infoDisplay.classList.remove('hidden');

        // 情報表示エリアの構築
        let infoHtml = `<span>生成完了${durationText}</span>`;
        if (savedKey) {
            infoHtml += `
                <span class="key-badge" title="クリックしてキーをコピー" onclick="navigator.clipboard.writeText('${savedKey}').then(() => alert('キーをコピーしました: ${savedKey}'))">
                  KEY: ${savedKey}
                </span>
            `;
        }
        infoDisplay.innerHTML = infoHtml;

        const { html, css, title } = payload;

        // データを内部に保存
        this.#generatedHtml = html;
        this.#generatedCss = css;
        this.#generatedTitle = title || 'Untitled-UI';

        htmlOutput.textContent = html;
        cssOutput.textContent = css;
        previewOutput.srcdoc = this.#createPreviewDoc(html, css);
        this.#switchTab('code');
        break;
    }
  }

  #loadFromFirestore = async () => {
    this.#updateUIState('LOADING', { message: `データ読み込み中 (Key: ${this.#loadKey})...` });

    try {
        if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined') {
            throw new Error('Firebase SDKが見つかりません。');
        }

        const db = firebase.firestore();
        // firestore-key(コレクション) + load-key(ドキュメントID) で取得
        const docRef = db.collection(this.#collection).doc(this.#loadKey);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error('指定されたキーのデータが見つかりませんでした。');
        }

        const data = doc.data();
        // SUCCESS状態へ (API呼び出し時間の代わりに読み込み完了とする)
        this.#updateUIState('SUCCESS', {
            html: data.html,
            css: data.css,
            title: data.title,
            savedKey: this.#loadKey // 読み込んだキーも表示
        });

    } catch (error) {
        console.error("読み込みエラー:", error);
        this.#updateUIState('ERROR', { message: error.message });
    }
  }

  #processRequest = async () => {
    this.#updateUIState('LOADING');
    this.#abortController = new AbortController();

    const startTime = performance.now();
    let durationMs = 0;

    try {
      const prompt = this.#buildPrompt(this.#originalHtml, this.#requestPrompt);
      const responseText = await this.#callGeminiApi(prompt, this.#abortController.signal);

      durationMs = performance.now() - startTime;

      if (!responseText) throw new Error("APIから空の応答がありました。");

      const jsonResponse = JSON.parse(responseText);

      if (typeof jsonResponse.html !== 'string' || typeof jsonResponse.css !== 'string' || typeof jsonResponse.title !== 'string') {
        throw new Error("APIの応答が期待したJSON形式(html, css, title)ではありません。");
      }

      // Firestoreへの保存 (ランダムキー生成を含む)
      let savedKey = null;
      try {
        savedKey = await this.#saveToFirestore(jsonResponse);
      } catch (err) {
        console.error("GeminiComponent: saveToFirestoreで予期せぬエラー", err);
      }

      this.#updateUIState('SUCCESS', { ...jsonResponse, durationMs, savedKey });

    } catch (error) {
      if (error.name !== 'AbortError') {
        if (durationMs === 0) {
            durationMs = performance.now() - startTime;
        }
        console.error("処理中にエラーが発生しました:", error);
        this.#updateUIState('ERROR', { message: error.message, durationMs });
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

  async #saveToFirestore(data) {
    if (!this.#collection) {
      console.log('GeminiComponent: firestore-keyが指定されていないため、保存をスキップします。');
      return null;
    }

    if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined') {
      console.error('GeminiComponent: Firebase Firestore SDK (v8互換) がグローバルスコープに見つかりません。');
      this.#elements.infoDisplay.textContent += ' (Firestore SDK未検出)';
      return null;
    }

    const docId = this.#saveKey || Math.random().toString(36).substring(2, 10);

    const saveData = {
      id: docId,
      title: data.title,
      html: data.html,
      css: data.css,
      request: this.#requestPrompt,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    try {
      const db = firebase.firestore();

      const docRef = db.collection(this.#collection).doc(docId);

      await docRef.set(saveData);

      console.log(`GeminiComponent: Firestoreにデータを保存しました (Collection: ${this.#collection}, ID: ${docId})`);
      return docId;

    } catch (error) {
      console.error(`GeminiComponent: Firestoreへの保存に失敗しました (Path: ${this.#collection})`, error);
      return null;
    }
  }

  #switchTab = (tabName) => {
    this.#elements.tabs.forEach(tab => tab.classList.toggle('active', tab.dataset.tab === tabName));
    this.#elements.tabContents.forEach(content => content.classList.toggle('active', content.id === tabName));
  };

  async #callGeminiApi(prompt, signal) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2
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
      あなたは世界トップクラスのUIエンジニアです。
      ユーザーから渡された「指示」と、場合によっては「対象HTML」に基づき、HTMLコードとCSSコードを生成してください。

      あなたは常に最新の技術とベストプラクティスに対応しています。
      あなたは、明確で効率的、簡潔かつ革新的なコーディングソリューションを提供することを目指しています。
      あなたは常に、そのまま使用できる完全なコードスニペットを生成します。

      ## ガイドライン

      ### HTML
      1. 「対象HTML」があれば、セマンティックHTML(\`main\`や\`header\`等)を使用して意味的に正しくリファクタリングしてください。
      2. 「対象HTML」がなければ、指示に基づき最適なHTML構造を新規生成してください。
      3. 正しいARIAロールと属性を必ず使用してください。
      4. 純粋に装飾目的の画像、またはスクリーンリーダーにとって繰り返しになる場合を除き、すべての画像に代替テキストを追加してください。

      ### CSS
      1. CSSはマテリアルデザインの原則に従ってください。
      2. CSSはレスポンシブデザインを実装してください。
      3. スクリーンリーダー専用テキストには「sr-only」Tailwindクラスを使用することを忘れないでください。
      4. 画像 (<img> タグ) は、アスペクト比を維持し、画像全体が表示されるようにしてください。意図しないトリミング (切り抜き) が発生する \`object-fit: cover;\` は避け、必要であれば \`object-fit: contain;\` や \`height: auto;\` を使用して、画像が途切れないようにしてください
      5. \`object-fit: contain;\` や \`height: auto;\` を使用して画像が途切れないようにする場合、画像コンテナ（ラッパー）の背景色は、コンポーネント全体の背景色（通常は \`#ffffff\`）と一致させるか、透明 (\`transparent\`) に設定し、余白部分の色が浮かないようにしてください

      ### 制約事項
      1. CSSは、外部のライブラリやフレームワーク（例: Tailwind CSS, Bootstrap）に依存してはいけません。純粋なCSSのみを生成してください。
      2. HTML内に <script> タグやインラインイベントハンドラ (例: onclick, onmouseover) を絶対に含まないでください。
      3. CSS内に外部リソース (例: @import, url()でのフォントや画像) を絶対に含まないでください。
      4. プレビューで正しく表示されないため、<iframe>, <video>, <audio> の使用は避けてください。

      ## 出力形式
      - 回答は必ずJSON形式でなければなりません。
      - JSONオブジェクトは 'html', 'css', 'title' の3つのキーのみを持つ必要があります。
      - 'html' の値: ガイドラインに従って生成または改善されたHTMLコード（文字列）。
      - 'css' の値: 生成された純粋なCSSコード（文字列）。
      - 'title' の値: ユーザーからの指示（${request}）内容を要約した、ぱっと見て何のUIかが分かる、簡潔な日本語のタイトル（文字列）。
      - JSONを囲む \`\`\`json や \`\`\` のようなMarkdownのコードブロック識別子を絶対に含めないでください。
      - 回答は純粋なJSONオブジェクトのみとしてください。挨拶、説明、その他のテキストは一切不要です。

      【ユーザーからの入力】
      ユーザーからの指示: ${request}
      ${htmlContent}
    `;
  }

  #createPreviewDoc(html, css) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.#generatedTitle || 'Generated UI'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
    }

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