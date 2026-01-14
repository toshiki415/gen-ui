class GeminiComponent extends HTMLElement {
  static API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

  static COLLECTION_NAME = 'gen-ui';

  static TEMPLATE = (() => {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          min-height: 50px;
          position: relative;
          position: relative;
          background: transparent;
        }
        .loading-overlay {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255, 255, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 20;
          backdrop-filter: blur(2px);
          border-radius: inherit;
        }
        .spinner {
          width: 24px;
          height: 24px;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-left-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        iframe {
          width: 100%;
          border: none;
          display: block;
          overflow: hidden;
          height: 100%;
        }

        .actions-container {
            position: absolute;
            bottom: 16px;
            right: 16px;
            display: flex;
            gap: 10px;
            z-index: 30;
        }

        .fab {
          width: 40px;
          height: 40px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          opacity: 0.3;
          transition: transform 0.2s, opacity 0.2s;
        }
        .actions-container:hover .fab {
            opacity: 1;
        }
        .fab:hover { transform: scale(1.1); }

        .btn-complete { color: #2ecc71; border-color: #2ecc71; } /* 緑色 */
        .btn-edit { color: #333; }

        .edit-fab {
          position: absolute;
          bottom: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 50%;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 30; /* iframeより上 */
          transition: transform 0.2s, opacity 0.2s;
          font-size: 1.2rem;
          opacity: 0.3; /* 普段は薄く */
        }
        .edit-fab:hover {
          opacity: 1;
          transform: scale(1.1);
        }

        .chat-overlay {
          position: absolute;
          inset: 0; /* 上下左右0 */
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(4px);
          z-index: 40;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .chat-box {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
        }
        .chat-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        button.btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-cancel { background: #eee; color: #333; }

        .hidden { display: none !important; }
      </style>

      <div id="container">
        <div id="loading-overlay" class="loading-overlay hidden">
          <div class="spinner"></div>
        </div>
        <iframe id="preview-output" title="Generated UI" scrolling="no"></iframe>

        <div class="actions-container">
            <button id="connect-btn" class="fab" title="ソースファイルと連携">🔗</button>
            <button id="complete-btn" class="fab btn-complete" title="確定して埋め込む">✅</button>
            <button id="edit-btn" class="fab btn-edit" title="AIと対話して修正">✏️</button>
        </div>

        <div id="chat-window" class="chat-overlay hidden">
          <div class="chat-box">
            <p style="margin:0; font-weight:bold; color:#555;">修正指示を入力</p>
            <textarea id="chat-input" class="chat-input" placeholder="例: 背景を青にして、もっと文字を大きくして"></textarea>
            <div class="chat-actions">
              <button id="chat-cancel" class="btn btn-cancel">閉じる</button>
              <button id="chat-submit" class="btn btn-primary">修正する</button>
            </div>
          </div>
        </div>
      </div>
    `;
    return template;
  })();

  static SELECTORS = {
    loadingOverlay: '#loading-overlay',
    previewOutput: '#preview-output',
    editBtn: '#edit-btn',
    completeBtn: '#complete-btn',
    chatWindow: '#chat-window',
    chatInput: '#chat-input',
    chatSubmit: '#chat-submit',
    chatCancel: '#chat-cancel',
    connectBtn: '#connect-btn',
  };

  #apiKey = null;
  #requestPrompt = null;
  #originalHtml = '';
  #loadKey = null;
  #saveKey = null;
  #elements = {};
  #abortController = null;
  #fileHandle = null;

  #currentCode = { html: '', css: '', javascript: '' };

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(GeminiComponent.TEMPLATE.content.cloneNode(true));

    for (const key in GeminiComponent.SELECTORS) {
      this.#elements[key] = this.shadowRoot.querySelector(GeminiComponent.SELECTORS[key]);
    }

    this.#setupInteractions();
  }

  #setupInteractions() {
    const { editBtn, completeBtn, chatWindow, chatCancel, chatSubmit, chatInput, connectBtn } = this.#elements;

    // 編集ボタンクリック -> チャット開く
    editBtn.addEventListener('click', () => {
      chatWindow.classList.remove('hidden');
      chatInput.focus();
    });

    // 閉じるボタン -> チャット閉じる
    chatCancel.addEventListener('click', () => {
      chatWindow.classList.add('hidden');
    });

    // 修正実行ボタン
    chatSubmit.addEventListener('click', () => {
      const instruction = chatInput.value.trim();
      if (!instruction) return;

      chatWindow.classList.add('hidden');
      chatInput.value = ''; // 入力欄クリア
      this.#processRefinement(instruction); // 修正処理へ
    });

    connectBtn.addEventListener('click', async () => {
        try {
            // ファイル選択ダイアログを表示（HTMLファイルのみ許可）
            const [handle] = await window.showOpenFilePicker({
                types: [{
                    description: 'HTML Files',
                    accept: { 'text/html': ['.html'] },
                }],
                multiple: false,
            });
            this.#fileHandle = handle;
            connectBtn.style.color = '#3b82f6'; // 連携成功したら青色にするなど
            connectBtn.title = `連携中: ${handle.name}`;
            alert(`「${handle.name}」と連携しました。\n完了ボタンを押すと、このファイルが自動的に書き換えられます。`);
        } catch (err) {
            // キャンセルされた場合など
            console.log('File selection cancelled or failed', err);
        }
    });

    completeBtn.addEventListener('click', async () => {
      const confirmMsg = this.#fileHandle 
            ? '連携中のファイルを直接書き換えて更新しますか？\n（念のためGit等でバックアップをとってください）'
            : 'ファイルを連携していません。クリップボードにコピーしますか？';

        if (!confirm(confirmMsg)) return;

        if (this.#fileHandle) {
            // 自動書き換え実行
            await this.#directWriteToFile();
        } else {
            // 従来通りクリップボードコピー
            await this.#copyToClipboard();
            this.#eject();
            alert('コピーしました。VSCodeに貼り付けてください。');
        }
    });
  }

  async #directWriteToFile() {
    try {
        const file = await this.#fileHandle.getFile();
        const originalContent = await file.text();

        // ----------------------------------------------------
        // 1. Prettier（整形ツール）の読み込み
        // ----------------------------------------------------
        // ※保存ボタンを押した時だけ読み込むので、普段の動作は重くなりません
        const prettierUrl = 'https://unpkg.com/prettier@3.1.1/standalone.mjs';
        const pluginHtmlUrl = 'https://unpkg.com/prettier@3.1.1/plugins/html.mjs';
        const pluginCssUrl = 'https://unpkg.com/prettier@3.1.1/plugins/postcss.mjs';
        const pluginJsUrl = 'https://unpkg.com/prettier@3.1.1/plugins/babel.mjs';
        const pluginEstreeUrl = 'https://unpkg.com/prettier@3.1.1/plugins/estree.mjs'; // JS整形の依存関係

        // モジュールを動的にインポート
        const [prettier, parserHtml, parserCss, parserJs, parserEstree] = await Promise.all([
            import(prettierUrl),
            import(pluginHtmlUrl),
            import(pluginCssUrl),
            import(pluginJsUrl),
            import(pluginEstreeUrl)
        ]);

        // ----------------------------------------------------
        // 2. IDの特定と対象の準備
        // ----------------------------------------------------
        let myId = this.getAttribute('id');
        let targetRegex;

        if (myId) {
            // ID指定あり
            targetRegex = new RegExp(`<gen-ui[^>]*id=["']${myId}["'][^>]*>(?:[\\s\\S]*?<\\/gen-ui>)?`, 'i');
            if (!targetRegex.test(originalContent)) throw new Error(`ID="${myId}" が見つかりません。`);
        } else {
            // ID指定なし（自動判別）
            const allTags = originalContent.match(/<gen-ui/gi);
            if (!allTags || allTags.length === 0) throw new Error("タグが見つかりません。");
            if (allTags.length > 1) throw new Error("IDのないタグが複数あります。id属性を追加してください。");
            targetRegex = /<gen-ui[\s\S]*?<\/gen-ui>/i;
            myId = 'gen-' + Math.random().toString(36).substring(2, 9);
        }

        const { html, css, javascript } = this.#currentCode;

        // JSのパッチ処理
        let patchedJs = javascript.replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\);?/g, '$1');
        patchedJs = patchedJs.replace(/document\.(querySelector|querySelectorAll|getElementById)/g, 'root.$1');

        // ----------------------------------------------------
        // 3. コードの組み立て（まだインデントはずれています）
        // ----------------------------------------------------
        const rawCode = `
<gen-ui id="${myId}">
<template>
<style>
${css}
</style>
${html}
<script>
(() => {
const root = document.getElementById('${myId}').shadowRoot;
try {
${patchedJs}
} catch (e) { console.error('GenUI Script Error:', e); }
})();
</script>
</template>
</gen-ui>`;

        // ----------------------------------------------------
        // 4. Prettierで整形実行（ここが魔法のステップです）
        // ----------------------------------------------------
        const formattedCode = await prettier.default.format(rawCode, {
            parser: "html",
            plugins: [
                parserHtml.default,
                parserCss.default,   // <style>内を整形
                parserJs.default,    // <script>内を整形
                parserEstree.default
            ],
            tabWidth: 2,             // インデントのスペース数（好みで変更可）
            printWidth: 120,         // 折り返し幅
        });

        // ----------------------------------------------------
        // 5. 書き込み実行
        // ----------------------------------------------------
        // 整形済みのコード(formattedCode)で置換
        const newContent = originalContent.replace(targetRegex, formattedCode.trim());

        const writable = await this.#fileHandle.createWritable();
        await writable.write(newContent);
        await writable.close();

        alert('書き換え完了！Prettierでコードを綺麗に整形しました✨');
        
        if(confirm('反映のためにリロードしますか？')) {
            location.reload();
        }

    } catch (err) {
        console.error(err);
        alert(`エラー: ${err.message}`);
    }
  }

  connectedCallback() {
    const template = this.querySelector('template');
    if (template) {
      // 1. Shadow DOM を作成（まだ無ければ）
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }
      
      // 2. 中身を複製して配置
      this.shadowRoot.innerHTML = ''; // クリア
      this.shadowRoot.appendChild(template.content.cloneNode(true));

      // 3. 【重要】スクリプトを強制実行させる
      // cloneNodeしただけのscriptタグは動かないため、作り直して置換します
      const scripts = this.shadowRoot.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        newScript.textContent = oldScript.textContent;
        oldScript.replaceWith(newScript);
      });

      return; // ここで終了
    }

    this.#apiKey = this.getAttribute('api-key');
    this.#requestPrompt = this.getAttribute('request');
    this.#loadKey = this.getAttribute('load-key');
    this.#saveKey = this.getAttribute('save-key');

    this.#originalHtml = this.innerHTML.trim();

    if (!this.#apiKey) {
      console.error('GeminiComponent: "api-key" attribute is required.');
      return;
    }

    this.#elements.previewOutput.addEventListener('load', this.#adjustIframeHeight);

    if (this.#loadKey) {
      this.#loadFromFirestore();
    } else {
      if (!this.#requestPrompt) {
        console.error('GeminiComponent: "request" attribute is required.');
        return;
      }
      this.#processRequest();
    }
  }

  disconnectedCallback() {
    this.#elements.previewOutput.removeEventListener('load', this.#adjustIframeHeight);
    this.#abortController?.abort();
  }

  #adjustIframeHeight = () => {
    const iframe = this.#elements.previewOutput;
    if (iframe.contentWindow && iframe.contentDocument) {
      setTimeout(() => {
          const bodyHeight = iframe.contentDocument.body.scrollHeight;
          const finalHeight = bodyHeight + 30;

          iframe.style.height = finalHeight + 'px';
          this.style.height = finalHeight + 'px';
      }, 300);
    }
  };

  #updateUIState(state) {
    const { loadingOverlay, previewOutput } = this.#elements;
    switch (state) {
      case 'LOADING':
        loadingOverlay.classList.remove('hidden');
        previewOutput.style.opacity = '0.5';
        break;
      case 'SUCCESS':
      case 'ERROR':
        loadingOverlay.classList.add('hidden');
        previewOutput.style.opacity = '1';
        break;
    }
  }

  #getContextStyles() {
    const computedStyle = window.getComputedStyle(document.body);
    return `
      親ページの背景色: ${computedStyle.backgroundColor}
      親ページの文字色: ${computedStyle.color}
      親ページのフォント: ${computedStyle.fontFamily}
    `;
  }

  #loadFromFirestore = async () => {
    this.#updateUIState('LOADING');
    try {
        if (typeof firebase === 'undefined') throw new Error('Firebase SDK missing');
        const db = firebase.firestore();
        const doc = await db.collection(GeminiComponent.COLLECTION_NAME).doc(this.#loadKey).get();

        if (!doc.exists) throw new Error('Document not found');

        const data = doc.data();
        this.#renderPreview(data.html, data.css, data.javascript);
    } catch (error) {
        console.error("Load Error:", error);
    } finally {
        this.#updateUIState('SUCCESS');
    }
  }

  #processRequest = async () => {
    this.#updateUIState('LOADING');
    this.#abortController = new AbortController();

    try {
      const contextStyles = this.#getContextStyles();
      const prompt = this.#buildPrompt(this.#originalHtml, this.#requestPrompt, contextStyles);

      const responseText = await this.#callGeminiApi(prompt, this.#abortController.signal);
      if (!responseText) throw new Error("Empty API response");

      const jsonResponse = JSON.parse(responseText);

      this.#saveToFirestore(jsonResponse);

      this.#renderPreview(jsonResponse.html, jsonResponse.css, jsonResponse.javascript);

    } catch (error) {
      console.error("Generation Error:", error);
    } finally {
      this.#updateUIState('SUCCESS');
      this.#abortController = null;
    }
  };

  #renderPreview(html, css, javascript) {
    this.#currentCode = { html, css, javascript };

    const iframeDoc = this.#createPreviewDoc(html, css, javascript);
    this.#elements.previewOutput.srcdoc = iframeDoc;
  }

  #processRefinement = async (instruction) => {
    this.#updateUIState('LOADING');
    this.#abortController = new AbortController();

    try {
      // 修正用プロンプトの構築
      const prompt = this.#buildRefinementPrompt(this.#currentCode, instruction);

      const responseText = await this.#callGeminiApi(prompt, this.#abortController.signal);
      if (!responseText) throw new Error("Empty API response");

      const jsonResponse = JSON.parse(responseText);

      // 保存 (上書き、または新規保存)
      this.#saveToFirestore(jsonResponse);

      // 描画
      this.#renderPreview(jsonResponse.html, jsonResponse.css, jsonResponse.javascript);

    } catch (error) {
      console.error("Refinement Error:", error);
      alert('修正中にエラーが発生しました');
    } finally {
      this.#updateUIState('SUCCESS');
      this.#abortController = null;
    }
  };

  async #copyToClipboard() {
    const { html, css, javascript } = this.#currentCode;
    
    // 生成コードを整形してまとめる
    const finalCode = `
<style>
${css}
</style>

${html}

<script>
  (() => {
    try {
      ${javascript}
    } catch (e) { console.error(e); }
  })();
</script>
`;

    try {
        await navigator.clipboard.writeText(finalCode.trim());
    } catch (err) {
        console.error('Copy failed', err);
    }
  }

  #eject() {
    const { html, css, javascript } = this.#currentCode;

    // 1. ラッパーを作成 (生成されたHTMLを格納)
    // IDが衝突しないようにランダムなIDを付与しておくと安全です
    const wrapper = document.createElement('div');
    const uniqueId = 'gen-' + Math.random().toString(36).substring(2, 9);
    wrapper.id = uniqueId;
    wrapper.innerHTML = html;

    // 2. CSSを適用
    // 注意: グローバル汚染を防ぐため、本来はCSSのスコープ化が必要ですが、
    // 今回は「置き換える」ことが目的なので、そのままstyleタグとして注入します。
    const styleTag = document.createElement('style');
    styleTag.textContent = css;
    wrapper.appendChild(styleTag);

    // 3. JavaScriptを実行
    // innerHTMLでscriptタグを入れても実行されないため、明示的に作成します
    if (javascript) {
        const scriptTag = document.createElement('script');
        
        // "DOMContentLoaded" イベントリスナーを削除して、中身だけ取り出す正規表現
        // これにより、埋め込んだ瞬間にコードが走るようになります
        let executableJs = javascript.replace(/document\.addEventListener\s*\(\s*['"]DOMContentLoaded['"]\s*,\s*\(\s*\)\s*=>\s*\{([\s\S]*)\}\s*\);?/g, '$1');
        
        // 万が一 function(){} 形式だった場合の置換なども考慮するなら単純化して以下のように即時実行させます
        scriptTag.textContent = `
            (() => {
                const root = document.getElementById('${uniqueId}');
                try {
                    // DOMContentLoaded対策: 中身をそのまま実行
                    ${executableJs}
                } catch(e) { console.error('GenUI Script Error:', e); }
            })();
        `;
        wrapper.appendChild(scriptTag);
    }

    // 4. 自分自身 (<gen-ui>) を新しい要素 (wrapper) に置き換える
    this.replaceWith(wrapper);
  }

  #buildRefinementPrompt(currentCode, instruction) {
    return `
      あなたはUIエンジニアです。
      以下の「現在のコード」を、ユーザーの「修正指示」に基づいて修正してください。

      ## 現在のコード
      HTML: ${currentCode.html}
      CSS: ${currentCode.css}
      JS: ${currentCode.javascript}

      ## ユーザーの修正指示
      ${instruction}

      ## 出力形式
      前回同様、必ずJSON形式('html', 'css', 'javascript', 'title')のみを出力してください。
      解説は不要です。コード全体を再生成してください。
    `;
  }

  async #saveToFirestore(data) {
    const docId = this.#loadKey || this.#saveKey || Math.random().toString(36).substring(2, 10);
    try {
      const db = firebase.firestore();

      await db.collection(GeminiComponent.COLLECTION_NAME).doc(docId).set({
        id: docId,
        title: data.title,
        html: data.html,
        css: data.css,
        javascript: data.javascript || '',
        request: this.#requestPrompt,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`Saved to Firestore (${GeminiComponent.COLLECTION_NAME}): ${docId}`);
    } catch (error) {
      console.error("Save Error:", error);
    }
  }

  async #callGeminiApi(prompt, signal) {
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
    };
    const url = `${GeminiComponent.API_BASE_URL}?key=${this.#apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
    if (!response.ok) throw new Error(`API Error: ${response.status}`);
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  #buildPrompt(html, request, contextStyles) {
    const htmlContent = html
      ? `対象HTML: ${html}`
      : `対象HTML: (なし。指示に基づき新規生成)`;

    return `
      あなたは世界トップクラスのUIエンジニアです。
      ユーザーから渡された「指示」と、場合によっては「対象HTML」に基づき、HTML、CSS、そして機能を実現するJavaScriptコードを生成してください。

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
      6. CSSセレクタは、可能な限り特定のクラス名を使用し、bodyやhtmlタグへの直接的なスタイル適用は避けてください。

      ### JavaScript
      1. バニラJavaScript（標準機能）のみを使用してください。外部ライブラリは禁止です。
      2. 生成されたHTML要素に対して、必要なインタラクション（クリックイベント、計算、DOM操作など）を実装してください。
      3. コードは \`document.addEventListener('DOMContentLoaded', () => { ... })\` 内に記述し、DOM読み込み後に実行されるようにしてください。
      4. エラーハンドリング（try-catch等）を適切に行い、コンソールエラーが出ないように配慮してください。

      ### 制約事項
      1. CSSは、外部のライブラリやフレームワーク（例: Tailwind CSS, Bootstrap）に依存してはいけません。
      2. CSS内に外部リソース (例: @import) を含めないでください。
      3. プレビューで正しく表示されないため、<iframe>, <video>, <audio> の使用は避けてください。
      4. HTML内に直接 <script> タグを書かず、JavaScriptコードはJSONの 'javascript' キーに分離して出力してください。

      ## 出力形式
      - 回答は必ずJSON形式でなければなりません。
      - JSONオブジェクトは 'html', 'css', 'javascript', 'title' の4つのキーのみを持つ必要があります。
      - 'html'の値: 生成されたHTMLコード（文字列）。<script>タグは含めないでください。
      - 'css' の値: 生成された純粋なCSSコード（文字列）。
      - 'javascript'の値: 生成されたJavaScriptコード（文字列）。
      - 'title' の値: ユーザーからの指示（${request}）内容を要約した、ぱっと見て何のUIかが分かる、簡潔な日本語のタイトル（文字列）。
      - JSONを囲む \`\`\`json や \`\`\` のようなMarkdownのコードブロック識別子を絶対に含めないでください。
      - 回答は純粋なJSONオブジェクトのみとしてください。挨拶、説明、その他のテキストは一切不要です。

      【コンテキスト情報（親ページのデザイン）】
      以下のスタイル情報を参考に、親ページのデザインに馴染むようにCSSのフォントや配色を微調整してください（ただし、上記のガイドラインやマテリアルデザインの原則が優先されます）：
      ${contextStyles}

      【ユーザーからの入力】
      ユーザーからの指示: ${request}
      ${htmlContent}
    `;
  }

  #createPreviewDoc(html, css, javascript) {
    const jsContent = javascript || '';

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    try {
      ${jsContent}
    } catch (e) {
      console.error('Generated Script Error:', e);
    }
  </script>
</body>
</html>
    `;
  }
}

customElements.define('gen-ui', GeminiComponent);