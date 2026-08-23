/**
 * 日本語翻訳テーブル
 */
export const ja = {
  // アプリ全体
  appTitle: "SesameKey Inspector",
  appSubtitle: "SESAME Bot 2 / Bot 3 のQRコードをブラウザだけで解析",
  privacyBadge: "完全クライアントサイド処理 — 画像・Secretはサーバーへ送信しません",

  // アップロードエリア
  uploadTitle: "QRコード画像を選択",
  uploadDesc: "ドラッグ&ドロップ、クリック、またはCtrl+Vで貼り付け",
  uploadButton: "画像を選択",
  uploadPaste: "クリップボードから貼り付け",
  uploadPasteError: "クリップボードへのアクセスが拒否されました",
  uploadPasteNoImage: "クリップボードに画像がありません",
  uploadHint: "PNG / JPEG / WebP / HEIC など対応",
  uploadDragging: "ここにドロップ",

  // 解析中
  analyzingTitle: "QRコードを解析しています…",
  analyzingStage: "処理中: {stage}",

  // 成功
  successTitle: "QRコードを検出しました",
  labelModel: "デバイスモデル",
  labelUri: "SESAME URI",
  labelDeviceName: "デバイス名",
  labelAccessLevel: "アクセス権限",
  labelSecretKey: "Secret Key",
  labelPublicKey: "Public Key",
  labelKeyIndex: "Key Index",
  labelUuid: "デバイスUUID",
  labelDecodeMethod: "デコード方式",

  // Secret Key 操作
  secretMasked: "••••••••••••••••••••••••••••••••",
  btnShowSecret: "表示",
  btnHideSecret: "非表示",
  btnCopySecret: "コピー",
  btnCopied: "コピーしました",
  btnCopyUri: "URIをコピー",
  btnReset: "別の画像を解析",

  // アクセス権限
  accessOwner: "オーナー (Owner)",
  accessManager: "マネージャー (Manager)",
  accessGuest: "ゲスト (Guest)",
  accessUnknown: "不明",

  // エラー
  errorTitle: "QRコードを読み取れませんでした",
  errorQrNotFound: "画像内にQRコードが見つかりませんでした。",
  errorQrDecodeFailed: "QRコードを検出しましたが、内容の読み取りに失敗しました。",
  errorInvalidUri: "QRコードの内容がSESAME形式ではありません。",
  errorMissingSk: "QRコードにSecret Key情報が含まれていません。",
  errorInvalidBase64url: "Secret Keyのデコードに失敗しました。Base64URLの形式が不正です。",
  errorInvalidSesameData: "SESAMEデータのフォーマットが不正です。",
  errorUnsupportedModel: "このデバイスモデルには対応していません。",
  errorSecretExtractionFailed: "Secret Keyの抽出に失敗しました。",
  errorUnknown: "予期しないエラーが発生しました。",

  // エラーヒント
  hintTitle: "対処方法",
  hint1: "QRコード全体が画像内に収まっているか確認してください",
  hint2: "QRコード周囲に十分な白い余白（Quiet Zone）があるか確認してください",
  hint3: "画像がぼやけていないか確認してください",
  hint4: "SESAME公式アプリから「このセサミの鍵をシェア」→「オーナー」または「マネージャー」のQRコードをご使用ください",
  hint5: "スクリーンショットの場合、QR部分をトリミングしてお試しください",

  // 言語切り替え
  langJa: "日本語",
  langEn: "English",
} as const;

export type TranslationKey = keyof typeof ja;
