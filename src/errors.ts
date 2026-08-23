/**
 * アプリ全体で使用するエラー種別定義
 *
 * ユーザー向けメッセージとデバッグ用コードを分離する。
 * Secret Key や QR内容はエラーメッセージに絶対に含めない。
 */

/** エラーコード一覧 */
export const SesameErrorCode = {
  /** 画像内にQRコードが見つからなかった */
  QR_NOT_FOUND: "QR_NOT_FOUND",
  /** QRコードを検出したがデコードに失敗した */
  QR_DECODE_FAILED: "QR_DECODE_FAILED",
  /** QR文字列が ssm:// URI 形式でない */
  INVALID_URI: "INVALID_URI",
  /** URI に sk パラメータがない */
  MISSING_SK: "MISSING_SK",
  /** sk が Base64URL として不正 */
  INVALID_BASE64URL: "INVALID_BASE64URL",
  /** デコード済みデータが SESAME フォーマットでない */
  INVALID_SESAME_DATA: "INVALID_SESAME_DATA",
  /** 未対応のデバイスモデル */
  UNSUPPORTED_MODEL: "UNSUPPORTED_MODEL",
  /** Secret Key の抽出に失敗 */
  SECRET_EXTRACTION_FAILED: "SECRET_EXTRACTION_FAILED",
} as const;
export type SesameErrorCode = typeof SesameErrorCode[keyof typeof SesameErrorCode];

/** アプリ固有のエラークラス */
export class SesameError extends Error {
  readonly code: SesameErrorCode;

  constructor(code: SesameErrorCode, message: string) {
    // message にはデバッグ情報のみ含める。Secret / sk / QR内容は禁止
    super(message);
    this.name = "SesameError";
    this.code = code;
  }
}
