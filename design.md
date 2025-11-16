# Mermaid シーケンス図ジェネレーター 設計書

## 1. システム概要
ブラウザ上でMermaid記法によるシーケンス図を作成・プレビュー・PNGダウンロードできるシングルページアプリ（SPA）。ローカル環境で`index.html`を開くだけで動作し、ユーザーがMermaidコードを入力またはファイルから読み込むことで図を生成する。

## 2. 要求仕様
- Mermaidコードを入力・編集・保存せずに即時プレビュー。
- 描画結果をPNG形式でダウンロード可能。
- Mermaidコードを埋め込んだHTMLファイルを生成してダウンロード可能（タイトルは画面入力値を反映）。
- Mermaidコードを含むテキストファイル（`.mmd`, `.mermaid`, `.txt`, `.md` 等）をドラッグ＆ドロップすると内容を読み込む。
- オフライン（Mermaid本体のCDN依存を除く）でもPNGダウンロード機能が利用可能。
- 描画・読み込み等の処理結果をステータスメッセージで利用者へ通知。

## 3. 構成
```
mermaidliveeditor/
├─ index.html   … 画面構造・外部ライブラリ読込
├─ style.css    … レイアウト・UIスタイル定義
├─ app.js       … 描画ロジック、イベント管理、PNG生成処理
└─ worklog.md   … 作業記録（仕様外運用のため必要に応じて参照）
```

## 4. 主要機能
### 4.1 Mermaid描画
- `app.js`内`renderDiagram()`でテキストエリア内容を`mermaidAPI.render()`に渡しSVGを生成。
- 成功時に`diagramContainer`へSVGを挿入し、ダウンロードボタンを有効化。
- エラー時は最後に成功したSVGを再表示しつつステータス更新。

### 4.2 PNGダウンロード
- `downloadDiagramAsPng()`で現在のSVGをクローンし、`XMLSerializer`→`Blob`→`Image`→`Canvas`でPNGへ変換。
- Canvas背景を白で塗りつぶし、`canvas.toDataURL("image/png")`をダウンロードリンクへ設定。
- ネットワーク非依存（Mermaid描画済みであればオフライン可）。

### 4.3 ドラッグ＆ドロップ読込
- `setupDragAndDrop()`で`.editor-panel`への`dragenter/dragover/dragleave/drop`を監視。
- テキストファイルの判定と`FileReader`によるUTF-8読込を実施、読み込み後に即描画。
- ドラッグ中は`.drag-active`クラス付与でハイライト。

### 4.4 ステータスメッセージとショートカット
- `updateStatus()`で処理結果を色付きテキストで表示。
- `Ctrl+Enter` / `⌘+Enter`で即時再描画可能。

### 4.5 図形パレットとダイアログ生成
- エディタパネル内に参加者・メッセージを表すドラッグ可能なパレットを配置。
- パレットからプレビュー領域へドロップ、またはクリック/Enter/Spaceでダイアログを表示。
- 参加者追加ダイアログ：IDと表示名を入力し、Mermaidコードへ`participant`行を挿入。
- メッセージ追加ダイアログ：送信元/送信先 participant、矢印タイプ、メッセージ本文を指定し、Mermaidコードへメッセージ行を追加。
- 追加後は自動描画し、ステータスに完了メッセージを表示。

### 4.6 HTML出力
- `downloadHtmlButton`を押下すると現在のMermaidコード（最後に正常描画された内容）をテンプレートHTMLへ埋め込み、`Blob`としてダウンロード。
- 出力HTMLはMermaid CDNを取得し`mermaid.initialize`を実行、開くだけで図が描画される。
- タイトル入力欄(`html-download-title`)から取得した値をHTMLの`<title>`と`<h1>`へ反映。
- HTML内に簡易スタイルとラッパーを同梱し、単体での閲覧性を確保。

## 5. 依存ライブラリ
- Mermaid: `https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js`
- PNG生成に外部依存なし（Canvas APIのみ）。

オフライン運用時はMermaidバンドルをローカル配置し、`index.html`のscript srcを差し替える。

## 6. データフロー
1. ユーザーがテキストエリアにコード入力またはファイル読込。
2. `renderDiagram()`がMermaidを用いてSVG生成、DOMへ挿入。
3. ダウンロード要求時、`convertSvgToPng()`がSVGをCanvasへ描画しPNGデータURL生成。
4. HTML出力要求時、`buildHtmlExportDocument()`がテンプレート文字列を生成し`Blob`化。
5. ブラウザが自動ダウンロードを開始。

## 7. UI設計
- 左側: 入力エリア（テキストエリア、ドラッグ＆ドロップガイド、図形パレット、操作ボタン）
- 右側: SVGプレビュー領域（スクロール可能）
- 共通: ヘッダー、レスポンシブ対応（幅 < 720pxで縦並び）

## 8. エラーハンドリング
- Mermaid描画失敗時: ステータス赤表示、最後の成功SVGを復元。
- PNG生成失敗時: ステータス赤表示。
- ファイル読込失敗／サポート外拡張子: ステータスで利用者に通知。

## 9. セキュリティ・サンドボックス
- Mermaidの`securityLevel: "strict"`を保持し、外部SVG操作を制限。
- ファイル読込はクライアント内のみで完結し、サーバー通信なし。

## 10. テスト観点
- 正常系: 入力・描画・ダウンロード・ファイル読込・ショートカット操作。
- 異常系: 空入力、無効コード、巨大ファイル、多数のドラッグイベント。
- レイアウト: モバイル幅での表示、SVGサイズ変化への追随。

## 11. 今後の拡張余地
- PNG以外の形式（SVGエクスポート等）サポート。
- テーマ切り替え（Mermaidのテーマ選択、ダークモード）。
- Mermaidバージョン切り替え機能。
- 作成履歴の保存・読み込み機能（ローカルストレージなど）。

## 12. 更新履歴