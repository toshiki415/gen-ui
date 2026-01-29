class GenUi extends HTMLElement {
  // ==================================================================================
  // Static Configuration
  // ==================================================================================
  static API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
  static COLLECTION_NAME = 'gen-ui';
  static PRETTIER_CONFIG = {
    urls: {
      main: 'https://unpkg.com/prettier@3.1.1/standalone.mjs',
      html: 'https://unpkg.com/prettier@3.1.1/plugins/html.mjs',
      css: 'https://unpkg.com/prettier@3.1.1/plugins/postcss.mjs',
      js: 'https://unpkg.com/prettier@3.1.1/plugins/babel.mjs',
      estree: 'https://unpkg.com/prettier@3.1.1/plugins/estree.mjs',
    }
  };

  static SELECTORS = {
    loadingOverlay: '#loading-overlay',
    previewOutput: '#preview-output',
    chatWindow: '#chat-window',
    chatInput: '#chat-input',
    chatSubmit: '#chat-submit',
    chatCancel: '#chat-cancel',
    uiTitle: '#ui-title',
    contextMenu: '#context-menu',
    ctxInsert: '#ctx-insert',
    ctxCopy: '#ctx-copy',
    ctxEdit: '#ctx-edit',
  };

  static TEMPLATE = (() => {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100vh; background: transparent; font-family: sans-serif; }
        iframe { width: 100%; height: 100%; border: none; display: block; }

        .loading-overlay { position: absolute; inset: 0; background: rgba(255,255,255,0.8); display: flex; align-items: center; justify-content: center; z-index: 20; }
        .spinner { width: 24px; height: 24px; border: 3px solid rgba(0, 0, 0, 0.1); border-left-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .chat-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(2px); z-index: 9999; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box; }
        .chat-box { width: 100%; max-width: 500px; display: flex; flex-direction: column; gap: 10px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.15); }
        .chat-input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; font-family: inherit; resize: vertical; min-height: 100px; box-sizing: border-box; }
        .chat-actions { display: flex; justify-content: flex-end; gap: 10px; }

        button.btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-primary:hover { opacity: 0.9; }
        .btn-cancel { background: #eee; color: #333; }

        .hidden { display: none !important; }

        .context-menu {
          position: absolute;
          background: white;
          border: 1px solid #e0e0e0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 4px 0;
          z-index: 1000;
          min-width: 160px;
          display: none;
          flex-direction: column;
        }
        .context-menu.visible { display: flex; }
        .context-menu-item {
          padding: 8px 16px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #333;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: background 0.2s;
        }
        .context-menu-item:hover { background: #f5f5f5; }

        #ui-title { display: none; }
      </style>
      <div id="loading-overlay" class="loading-overlay hidden"><div class="spinner"></div></div>
      <iframe id="preview-output" title="Generated UI"></iframe>
      <div id="ui-title"></div>

      <div id="context-menu" class="context-menu">
        <div id="ctx-insert" class="context-menu-item">挿入</div>
        <div id="ctx-copy" class="context-menu-item">コピー</div>
        <div id="ctx-edit" class="context-menu-item">修正</div>
      </div>

      <div id="chat-window" class="chat-overlay hidden">
        <div class="chat-box">
          <p style="margin:0; font-weight:bold; color:#555;">修正指示を入力</p>
          <textarea id="chat-input" class="chat-input" placeholder="例: 背景を暗くして、文字を大きくして"></textarea>
          <div class="chat-actions">
            <button id="chat-cancel" class="btn btn-cancel">閉じる</button>
            <button id="chat-submit" class="btn btn-primary">修正する</button>
          </div>
        </div>
      </div>
    `;
    return template;
  })();

  // ==================================================================================
  // Private Fields
  // ==================================================================================
  #apiKey = null;
  #requestPrompt = null;
  #originalHtml = '';
  #loadKey = null;
  #saveKey = null;
  #elements = {};
  #abortController = null;
  #fileHandle = null;
  #currentCode = { html: '', css: '', javascript: '' };
  static #prettierModules = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(GenUi.TEMPLATE.content.cloneNode(true));
    Object.entries(GenUi.SELECTORS).forEach(([key, selector]) => {
      this.#elements[key] = this.shadowRoot.querySelector(selector);
    });
    this.#setupInteractions();
  }

  // ==================================================================================
  // Lifecycle Methods
  // ==================================================================================
  connectedCallback() {
    if (!this.isConnected) return;
    setTimeout(() => {
      if (this.querySelector('template')) {
        this.#hydrateExistingContent();
      } else {
        this.#initialize();
      }
    }, 0);
  }

  disconnectedCallback() {
    this.#abortController?.abort();
  }

  #initialize() {
    this.#apiKey = this.getAttribute('api-key');
    this.#requestPrompt = this.getAttribute('request');
    this.#loadKey = this.getAttribute('load-key');
    this.#saveKey = this.getAttribute('save-key');
    this.#originalHtml = this.innerHTML.trim();

    if (this.#loadKey) return this.#loadFromFirestore();
    if (!this.#apiKey) return console.error('GenUi: "api-key" attribute is required for generation.');
    if (this.#requestPrompt) this.#processRequest();
  }

  // ==================================================================================
  // Event Handlers
  // ==================================================================================
  #setupInteractions() {
    const { chatWindow, chatCancel, chatSubmit, chatInput } = this.#elements;
    const { ctxInsert, ctxCopy, ctxEdit } = this.#elements;

    chatCancel.addEventListener('click', () => chatWindow.classList.add('hidden'));
    chatSubmit.addEventListener('click', () => {
      const instruction = chatInput.value.trim();
      if (!instruction) return;
      chatWindow.classList.add('hidden');
      chatInput.value = '';
      this.#processRefinement(instruction);
    });

    this.shadowRoot.addEventListener('click', (e) => {
      if (!e.target.closest('#context-menu')) {
        this.#hideContextMenu();
      }
    });

    ctxInsert.addEventListener('click', async () => {
      this.#hideContextMenu();
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'HTML Files', accept: { 'text/html': ['.html'] } }],
          multiple: false,
        });

        this.#fileHandle = handle;
        await this.#directWriteToFile();
        
      } catch (err) {
        // ファイル選択キャンセル時などは何もしない
      }
    });

    ctxCopy.addEventListener('click', () => {
      this.#hideContextMenu();
      this.#copyToClipboard();
      alert('コピーしました。');
    });

    ctxEdit.addEventListener('click', () => {
      this.#hideContextMenu();
      chatWindow.classList.remove('hidden');
      chatInput.focus();
    });
  }

  #showContextMenu(x, y) {
    const menu = this.#elements.contextMenu;
    const rect = this.getBoundingClientRect();

    let left = x;
    let top = y;
    if (left + 160 > rect.width) left = rect.width - 160;
    if (top + 120 > rect.height) top = rect.height - 120;

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    menu.classList.add('visible');
  }

  #hideContextMenu() {
    this.#elements.contextMenu.classList.remove('visible');
  }

  // ==================================================================================
  // Core Logic: File Operations & Code Assembly
  // ==================================================================================
  async #directWriteToFile() {
    try {
      const file = await this.#fileHandle.getFile();
      const originalContent = await file.text();
      
      const { targetRegex, myId } = this.#identifyTargetTag(originalContent);
      const prettierData = await this.#loadPrettier();
      const rawCode = this.#assembleFinalCode('web-component', myId);
      
      const formattedCode = await this.#formatCodeWithPrettier(rawCode, prettierData);

      const newContent = originalContent.replace(targetRegex, formattedCode.trim());
      
      const writable = await this.#fileHandle.createWritable();
      await writable.write(newContent);
      await writable.close();

      // 修正: 書き込み完了後のアラートとリロード確認を削除
      
    } catch (err) {
      console.error(err);
      alert(`エラー: ${err.message}`);
    }
  }

  async #copyToClipboard() {
    const finalCode = this.#assembleFinalCode('simple-embed');
    await navigator.clipboard.writeText(finalCode.trim());
  }

  #identifyTargetTag(content) {
    let myId = this.getAttribute('id');
    let targetRegex;

    if (myId) {
      targetRegex = new RegExp(`<gen-ui[^>]*id=["']${myId}["'][^>]*>([\\s\\S]*?<\\/gen-ui>)?`, 'i');
      if (!targetRegex.test(content)) throw new Error(`ID="${myId}" が見つかりません。`);
    } else {
      const allTags = content.match(/<gen-ui/gi);
      if (!allTags || !allTags.length) throw new Error("タグが見つかりません。");
      if (allTags.length > 1) throw new Error("IDのないタグが複数あります。id属性を追加してください。");
      targetRegex = /<gen-ui[\s\S]*?<\/gen-ui>/i;
      myId = 'gen-' + Math.random().toString(36).substring(2, 9);
    }
    return { targetRegex, myId };
  }

  #assembleFinalCode(mode, componentId = '') {
    const { html, css, javascript } = this.#currentCode;
    const resetCss = `*, *::before, *::after { box-sizing: border-box; }`;

    if (mode === 'web-component') {
      const processedJs = javascript.replace(/document\.(querySelector|querySelectorAll|getElementById)/g, 'root.$1');
      return `
<gen-ui id="${componentId}">
<template>
<style>
${resetCss}
${css}
</style>
${html}
<script>
(() => {
const root = document.getElementById('${componentId}').shadowRoot;
try {
${this.#extractJsContent(processedJs)}
} catch (e) { console.error('GenUI Script Error:', e); }
})();
<\/script>
</template>
</gen-ui>`;
    }

    return `
<style>${resetCss}${css}</style>
${html}
<script>(() => { try { ${javascript} } catch (e) { console.error(e); } })();<\/script>`;
  }

  #extractJsContent(jsCode) {
    return jsCode.replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\);?/g, '$1');
  }

  async #loadPrettier() {
    if (GenUi.#prettierModules) return GenUi.#prettierModules;
    const { urls } = GenUi.PRETTIER_CONFIG;
    const [prettier, html, css, js, estree] = await Promise.all([
      import(urls.main), import(urls.html), import(urls.css), import(urls.js), import(urls.estree)
    ]);
    GenUi.#prettierModules = { 
      prettier: prettier.default, 
      plugins: [html.default, css.default, js.default, estree.default] 
    };
    return GenUi.#prettierModules;
  }

  async #formatCodeWithPrettier(code, { prettier, plugins }) {
    return await prettier.format(code, {
      parser: "html",
      plugins: plugins,
      tabWidth: 2,
      printWidth: 120,
    });
  }

  #hydrateExistingContent() {
    const template = this.querySelector('template');
    if (!template) return;
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.shadowRoot.querySelectorAll('script').forEach(old => {
      const fresh = document.createElement('script');
      fresh.textContent = old.textContent;
      old.replaceWith(fresh);
    });
  }

  // ==================================================================================
  // UI & Rendering Logic
  // ==================================================================================
  #updateUIState(state) {
    const { loadingOverlay, previewOutput, uiTitle } = this.#elements;
    const isLoading = state === 'LOADING';
    loadingOverlay.classList.toggle('hidden', !isLoading);
    previewOutput.style.opacity = isLoading ? '0.5' : '1';
    uiTitle.classList.toggle('loading', isLoading);
    if (isLoading) uiTitle.textContent = 'Generating...';
  }

  #renderPreview(html, css, javascript, title) {
    this.#currentCode = { html, css, javascript };
    
    const iframeCss = `body{margin:0;padding:0;min-height:100vh;background:#fff;}*,*::before,*::after{box-sizing:border-box;}${css}`;
    
    this.#elements.previewOutput.srcdoc = `<!DOCTYPE html><html lang="ja"><head><meta charset="UTF-8"><style>${iframeCss}</style></head><body>${html}<script>try{${javascript||''}}catch(e){console.error(e)}<\/script></body></html>`;
    this.#elements.uiTitle.textContent = title || this.#requestPrompt || 'No Title';

    this.#elements.previewOutput.onload = () => {
        try {
            const doc = this.#elements.previewOutput.contentDocument;
            doc.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const iframeRect = this.#elements.previewOutput.getBoundingClientRect();
                const x = e.clientX + iframeRect.left;
                const y = e.clientY + iframeRect.top;
                this.#showContextMenu(x, y);
            });
            doc.addEventListener('click', () => this.#hideContextMenu());
        } catch (e) {
            console.warn("Context menu access denied", e);
        }
    };
  }

  // ==================================================================================
  // API & Data Logic
  // ==================================================================================
  async #loadFromFirestore() {
    this.#updateUIState('LOADING');
    try {
      if (typeof firebase === 'undefined') throw new Error('Firebase SDK missing');
      const doc = await firebase.firestore().collection(GenUi.COLLECTION_NAME).doc(this.#loadKey).get();
      if (!doc.exists) throw new Error('Document not found');
      const data = doc.data();
      this.#renderPreview(data.html, data.css, data.javascript, data.title);
    } catch (error) {
      console.error(error);
    } finally {
      this.#updateUIState('SUCCESS');
    }
  }

  async #saveToFirestore(data) {
    if (typeof firebase === 'undefined') return;
    const docId = this.#loadKey || this.#saveKey || Math.random().toString(36).substring(2, 10);
    try {
      await firebase.firestore().collection(GenUi.COLLECTION_NAME).doc(docId).set({
        id: docId, ...data, request: this.#requestPrompt, createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Saved: ${docId}`);
    } catch (e) { console.error(e); }
  }

  async #processRequest() {
    await this.#executeGemini((html) => this.#buildPrompt(`<style>${Array.from(document.querySelectorAll('style')).map(s=>s.textContent).join('\n')}</style>${html}`, this.#requestPrompt, document.body.innerHTML));
  }

  async #processRefinement(instruction) {
    await this.#executeGemini(() => this.#buildPrompt(this.#currentCode.html, instruction, document.body.innerHTML));
  }

  async #executeGemini(promptBuilder) {
    this.#updateUIState('LOADING');

    this.#abortController = new AbortController();
    try {
      const prompt = promptBuilder(this.#originalHtml);
      const url = `${GenUi.API_BASE_URL}?key=${this.#apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
        signal: this.#abortController.signal,
      });
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const json = JSON.parse((await response.json())?.candidates?.[0]?.content?.parts?.[0]?.text);
      if (!json) throw new Error("Empty response");
      
      this.#saveToFirestore(json);
      this.#renderPreview(json.html, json.css, json.javascript, json.title);
    } catch (err) {
      console.error(err);
      if (err.name !== 'AbortError') alert('生成エラー');
    } finally {
      this.#updateUIState('SUCCESS');
      this.#abortController = null;
    }
  }

  #buildPrompt(html, request, parent) {
    const targetHtml = html ? `${html}` : `なし。指示に基づき新規生成`;
    const parentHtml = parent ? `${parent}` : `なし`;

    return `
    ## 命令
    あなたは世界トップクラスのUIエンジニアです。
    「ユーザーからの指示」と、「対象HTML」に基づき、HTML、CSS、JavaScriptコードを生成してください。

    ## 文脈
    ### HTML
    1. 「対象HTML」があれば、セマンティックHTML(\`main\`や\`header\`等)を使用して意味的に正しくリファクタリングしてください。
    2. 「対象HTML」がなければ、指示に基づき最適なHTMLを新規生成してください。
    3. 「親ページのHTML」があれば、デザインとレイアウトの整合性を取るために参照してください。ただし生成するコードに含めないでください。
    4. 正しいARIAロールと属性を必ず使用してください。
    5. 純粋に装飾目的の画像、またはスクリーンリーダーにとって繰り返しになる場合を除き、すべての画像に代替テキストを追加してください。
    6. 配置用の親要素（divやwrapper等）で囲まず、コンポーネント本体をルート要素として出力してください。

    ### CSS
    1. CSSはマテリアルデザインの原則に従ってください。
    2. CSSはレスポンシブデザインを実装してください。
    3. 画像の表示（\`object-fit\`）は、画像の役割に応じて以下のように使い分けてください
        - 背景・装飾・風景・アバター: コンテナ全体を埋めるために \`object-fit: cover;\` を使用し、余白が出ないようにしてください。
        - 商品・図解・グラフ: 全体が見えることが重要な場合は \`object-fit: contain;\` を使用してください。ただし、その場合は余白が目立たないよう、画像コンテナの背景色を調整（透明または画像と馴染む色）してください。
    4. 画像エリアは、レイアウト崩れを防ぐために適切な高さ指定（\`height\`）またはアスペクト比（\`aspect-ratio\`）を設定してください。
    5. CSSセレクタは、可能な限り特定のクラス名を使用し、bodyやhtmlタグへの直接的なスタイル適用は避けてください。
    6. 画面中央揃えやbodyへのレイアウト指定は禁止です。コンポーネント内部のスタイルのみ記述してください。

    ### JavaScript
    1. バニラJavaScriptのみを使用してください。外部ライブラリは禁止です。
    2. 生成されたHTML要素に対して、必要なインタラクション（クリックイベント、計算、DOM操作など）を実装してください。
    3. コードは \`document.addEventListener('DOMContentLoaded', () => { ... })\` 内に記述し、DOM読み込み後に実行されるようにしてください。
    4. エラーハンドリング（try-catch等）を適切に行い、コンソールエラーが出ないように配慮してください。

    ### 画像リソースのルール
    画像（imgタグやbackground-image等）の扱いは、以下の優先順位とルールを厳守してください。
    1. 既存パスの維持（最優先）:
      - 「対象HTML」に既に記述されている画像パスは、そのまま出力してください。
    2. 新規ダミー画像の生成:
      - 指示により新しく画像要素を追加する場合や、元画像のパスが空の場合に限り、以下のURL形式を使用してください。
      A. 一般的な画像（背景、商品、記事等）:
        - 書式: "https://picsum.photos/seed/{seed_id}/{width}/{height}"
        - {width}, {height} は必要なサイズ（例: 800/600）に置き換える。
        - {seed_id} には画像の文脈を表す固定の英単語（例: "nature", "city", "food"）を入れてください。
        - 例: <img src="https://picsum.photos/seed/nature/400/300" alt="風景">
      B. ユーザープロフィール画像（アバター・アイコン）:
        - 書式: "https://i.pravatar.cc/{size}?u={unique_id}"
        - {size} はサイズ（例: 150）。uパラメータには固定の文字列を入れる。
        - 例: <img src="https://i.pravatar.cc/150?u=user1" alt="ユーザーアイコン" style="border-radius: 50%;">

    ### 制約条件
    1. CSSは、外部のライブラリやフレームワーク（Tailwind CSS や Bootstrap等）に依存してはいけません。
    2. CSS内に外部リソース (@import等) を含めないでください。
    3. <iframe>, <video>, <audio> の使用は避けてください。
    4. HTML内に直接 <script> タグを書かず、JavaScriptコードはJSONの 'javascript' キーに分離して出力してください。

    ## 入力データ
    - ユーザーからの指示: ${request}
    - 対象HTML: ${targetHtml}
    - 親ページのHTML: ${parentHtml}

    ## 出力指示子
    - 回答は必ずJSON形式でなければなりません。
    - JSONオブジェクトは 'html', 'css', 'javascript', 'title' の4つのキーのみを持つ必要があります。
    - 'html'の値: 生成されたHTMLコード（文字列）。<script>タグは含めないでください。
    - 'css' の値: 生成された純粋なCSSコード（文字列）。
    - 'javascript'の値: 生成されたJavaScriptコード（文字列）。
    - 'title' の値: 必ず生成してください。「ユーザーからの指示」を要約した、10文字程度の簡潔な日本語のタイトル（例: "ログインフォーム", "商品一覧カード"）。空文字は禁止です。
    - JSONを囲む \`\`\`json や \`\`\` のようなMarkdownのコードブロック識別子を絶対に含めないでください。
    - 回答は純粋なJSONオブジェクトのみとしてください。挨拶、説明、その他のテキストは一切不要です。
    `;
  }
}
customElements.define('gen-ui', GenUi);