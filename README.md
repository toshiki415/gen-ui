# <gen-ui>
**LLMを活用したWebコンポーネントによる汎用型UI生成ツール**
*(Development of General-purpose UI Generation Tool using Web Components and LLMs)*

[![Generic badge](https://img.shields.io/badge/Status-Graduation_Thesis-blue.svg)](https://github.com/your-username/gen-ui)
[![Generic badge](https://img.shields.io/badge/Tech-Web_Components-orange.svg)](https://developer.mozilla.org/ja/docs/Web/API/Web_components)
[![Generic badge](https://img.shields.io/badge/Model-Gemini_2.5_Flash-googblue.svg)](https://deepmind.google/technologies/gemini/)

## 概要 (Abstract)
本リポジトリは、大阪工業大学 ロボティクス＆デザイン工学部 システムデザイン工学科 2025年度卒業論文「LLMを活用したWebコンポーネントによる汎用型UI生成ツールの開発」において実装されたソースコードです。

`<gen-ui>` は、Google Gemini API を活用し、自然言語の指示から動的にUIコンポーネントを生成・レンダリングするWeb Componentsです。HTMLタグを1行記述するだけで、フレームワークに依存せず、あらゆるWebページにAIによるUI生成機能を組み込むことができます。

## 特徴 (Features)
* **Web Components準拠:** フレームワーク非依存（Vanilla JS）で実装されており、React, Vue, 静的HTMLなど環境を選ばず動作します。
* **Shadow DOM:** スタイルをカプセル化し、既存サイトのデザイン干渉（CSS汚染）を物理的に防ぎます。
* **AI駆動:** Google Gemini 2.5 Flash モデルを使用し、マテリアルデザインに準拠した高品質なコードを生成します。
* **インタラクティブな修正:** コンテキストメニューから対話的にデザインの微調整が可能です。
* **コード挿入機能:** File System Access APIを使用し、生成結果をソースコードとしてHTMLファイルに直接書き出すことができます。

## 使い方 (Usage)

### 1. セットアップ
本パッケージをプロジェクトに読み込みます。

```html
<script type="module" src="./gen-ui.js"></script>
```

### 2. 基本的な記述
HTMLファイル内の任意の場所にタグを配置し、api-key と request を指定します。

```html
<body>
  <gen-ui api-key="YOUR_GEMINI_API_KEY" request="観光名所を紹介するカードを作成してください">
  </gen-ui>
</body>
```
### 3. 属性 (Attributes)
| 属性名 | 説明 |
|--------|--------|
| api-key | Google Gemini APIキー |
| request | 生成したいUIの指示 |
| save-key | 生成結果をFirestoreに保存する際のID |
| load-key | 過去の生成結果を呼び出す際のID |

### 技術スタック (Tech Stack)
- Frontend: HTML5, CSS3, JavaScript (ES2024), Web Components (Custom Elements, Shadow DOM)
- AI Model: Google Gemini 2.5 Flash
- Database: Google Cloud Firestore (v12.6.0)
- Tools: Node.js v22.17.0
