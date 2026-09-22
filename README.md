# SesameKey Inspector

SESAME Bot 2 / Bot 3 のQRコードをブラウザだけで解析する、完全クライアントサイドのWebアプリです。

**画像・QRコード・Secret Key はすべてブラウザ内でのみ処理され、サーバーへは一切送信しません。**

---

## 機能

- 📷 QRコード画像のアップロード（ファイル選択 / ドラッグ&ドロップ / クリップボード貼り付け）
- 🔍 段階的な画像前処理によるQRコード検出率の最大化
- 🔑 Secret Key、Public Key、デバイスUUID、モデル情報の抽出・表示
- 🧪 SESAME Bot 3をBot 2としてNature Homeへ登録する偽装QR生成
- 🔐 10分限定の暗号化QRを検出し、非対応理由と再生成手順を表示
- 🔒 Secret Key のデフォルトマスク表示、「表示」/「コピー」ボタン
- 🌐 日本語 / English 切り替え対応
- 🌙 ダークモード / ライトモード対応（`prefers-color-scheme`）
- 📱 スマートフォン対応（レスポンシブデザイン）
- ⚡ PWA対応（機内モードでも利用可能）

---

## セットアップ

### 前提条件

- Node.js 20以上
- pnpm 10以上
- Cloudflare アカウント（デプロイ時）

### インストール

```bash
pnpm install
```

---

## 開発

```bash
pnpm dev
```

`http://localhost:5173` で開発サーバーが起動します。

---

## ビルド

```bash
pnpm build
```

`dist/` ディレクトリにビルド成果物が生成されます。

### ビルドのプレビュー

```bash
pnpm preview
```

---

## デプロイ

### Cloudflare Workers へのデプロイ

```bash
pnpm deploy
```

または手動:

```bash
pnpm build
pnpm exec wrangler deploy
```

### 初回デプロイの認証

```bash
pnpm exec wrangler login
```

### Custom Domain の設定

1. Cloudflare ダッシュボードで [Workers & Pages] → 対象Worker → [Settings] → [Domains & Routes] を開く
2. [Add] → [Custom Domain] をクリック
3. ドメインを入力（例: `sesame.example.com`）
4. DNSレコードが自動的に追加される

または `wrangler.jsonc` で設定:

```jsonc
{
  "name": "sesame-key-inspector",
  "compatibility_date": "2026-08-23",
  "assets": {
    "not_found_handling": "single-page-application"
  },
  "routes": [
    {
      "pattern": "sesame.example.com/*",
      "custom_domain": true
    }
  ]
}
```

---

## セキュリティ設計

### 完全クライアントサイド処理

このアプリは以下の情報を**絶対にサーバーへ送信しません**:

| 情報 | 処理場所 |
|---|---|
| アップロード画像 | ブラウザ内のみ |
| QRコード文字列 | ブラウザ内のみ |
| `ssm://` URI | ブラウザ内のみ |
| `sk` パラメータ | ブラウザ内のみ |
| Secret Key | ブラウザ内のみ |
| デコード済みバイナリ | ブラウザ内のみ |

Cloudflare Workers は**静的ファイルの配信のみ**を行います。

### データの一時性

解析結果はメモリ上にのみ保持されます。ページをリロードまたは閉じると、すべての結果（Secret Keyを含む）が消去されます。

以下へは一切保存されません:
- `localStorage` / `sessionStorage` / `IndexedDB`
- Cookie
- URL (クエリパラメータ / フラグメント)
- `console.log`
- Analytics / エラーレポーティングサービス

### CSP

`<meta http-equiv="Content-Security-Policy">` タグで以下の制限を設定:

- 外部スクリプト読み込み禁止
- `connect-src 'self'` で外部APIへの通信禁止
- `frame-src 'none'` でiFrame禁止

### 言語設定の保存

言語設定 (`ja` / `en`) のみ `localStorage` に保存します。Secret Key や QRデータは一切保存しません。

---

## 技術スタック

| 技術 | バージョン | 用途 |
|---|---|---|
| Vite | 8.x | ビルドツール |
| TypeScript | 6.x | 型安全な実装 |
| `@cloudflare/vite-plugin` | 1.x | Cloudflare Workers 対応 |
| `qr-scanner` (nimiq) | 1.x | QRデコード（フォールバック） |
| `vite-plugin-pwa` | 1.x | PWA対応 |

QRデコードは以下の優先順位で試行します:
1. **BarcodeDetector API** — Chrome/Edge/Android Chrome のネイティブAPI（バンドルサイズ0）
2. **qr-scanner** — Lazy-loadされる軽量フォールバック

---

## プロジェクト構成

```
src/
├── qr/
│   ├── decoder.ts         # QRデコーダー (BarcodeDetector + qr-scanner)
│   ├── preprocess.ts      # 画像前処理パイプライン
│   └── worker-entry.ts    # Web Worker エントリーポイント
├── sesame/
│   ├── uri.ts             # ssm:// URI パーサー
│   ├── base64url.ts       # Base64URL デコーダー
│   ├── parser.ts          # SESAMEバイナリパーサー
│   └── models.ts          # デバイスタイプ定義
├── ui/
│   ├── upload.ts          # ファイル入力 / D&D / Clipboard
│   ├── result.ts          # 結果表示
│   └── error.ts           # エラー表示
├── i18n/
│   ├── ja.ts              # 日本語翻訳
│   ├── en.ts              # 英語翻訳
│   └── index.ts           # 言語管理
├── errors.ts              # エラー種別定義
├── main.ts                # アプリエントリーポイント
└── style.css              # スタイル
```

---

## SESAMEバイナリフォーマット

`sk` パラメータを Base64URL デコードした後のバイト構造（CANDY HOUSE公式ドキュメント確認済み）。OS2の99バイト形式に加え、Bot 2 / Bot 3で使われるOS3の39バイト形式にも対応しています。

| オフセット | サイズ | 内容 |
|---|---|---|
| 0 | 1 byte | Product Model（デバイスタイプ番号） |
| 1–16 | 16 bytes | Secret Key |
| 17–80 | 64 bytes | Public Key |
| 81–82 | 2 bytes | Key Index（little-endian） |
| 83–98 | 16 bytes | Device UUID |

OS3コンパクト形式ではPublic Keyが4バイト、Key Indexが21–22、Device UUIDが23–38に格納されます。

10分限定の暗号化QRには共有鍵本体ではなく16バイトの交換トークンだけが含まれます。復号にはCANDY HOUSEの認証済みAPIが必要で、完全クライアントサイドという本アプリの設計と両立しないため、検出時は暗号化をOFFにして再生成するよう案内します。

## デバイスタイプ番号

| 番号 | 機種 |
|---|---|
| 2 | Sesame Bot 1 |
| 17 | Sesame Bot 2 |
| 35 | Sesame Bot 3 |
| 0 | Sesame 3 |
| 4 | Sesame 4 |
| 5 | Sesame 5 |
| ... | ... |

---

## 多言語対応の追加

`src/i18n/` に新しい言語ファイルを追加するだけです:

1. `src/i18n/fr.ts` を作成（`ja.ts` をコピーして翻訳）
2. `src/i18n/index.ts` の `Lang` 型と `translations` に追加
3. ヘッダーの言語切り替えボタンを更新

---

## 作者

**りゅうや** — [@_ryuya_0124](https://x.com/_ryuya_0124)

---

## ライセンス

MIT
