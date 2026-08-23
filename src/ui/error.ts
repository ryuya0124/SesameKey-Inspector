/**
 * エラー表示モジュール
 *
 * SesameErrorCode に対応したユーザー向けメッセージを表示する。
 * エラーメッセージに Secret / sk / QR内容 を含めない。
 */

import { SesameError, SesameErrorCode } from "../errors.ts";
import { t } from "../i18n/index.ts";

/**
 * エラーコードに対応した i18n キーを返す
 */
function getErrorMessageKey(
  code: SesameErrorCode,
): keyof typeof import("../i18n/ja.ts").ja {
  switch (code) {
    case SesameErrorCode.QR_NOT_FOUND:
      return "errorQrNotFound";
    case SesameErrorCode.QR_DECODE_FAILED:
      return "errorQrDecodeFailed";
    case SesameErrorCode.INVALID_URI:
      return "errorInvalidUri";
    case SesameErrorCode.MISSING_SK:
      return "errorMissingSk";
    case SesameErrorCode.INVALID_BASE64URL:
      return "errorInvalidBase64url";
    case SesameErrorCode.INVALID_SESAME_DATA:
      return "errorInvalidSesameData";
    case SesameErrorCode.UNSUPPORTED_MODEL:
      return "errorUnsupportedModel";
    case SesameErrorCode.SECRET_EXTRACTION_FAILED:
      return "errorSecretExtractionFailed";
    default:
      return "errorUnknown";
  }
}

/**
 * エラーメッセージをエラーセクションに表示する
 * @param error SesameError またはその他のエラー
 */
export function renderError(error: unknown): void {
  const msgEl = document.getElementById("error-message");
  if (!msgEl) return;

  if (error instanceof SesameError) {
    const key = getErrorMessageKey(error.code);
    msgEl.textContent = t(key);
    // 開発用: Secret含まないエラーコードのみログ出力
    if (import.meta.env.DEV) {
      console.warn(`[SesameKey] Error code: ${error.code}`);
    }
  } else {
    msgEl.textContent = t("errorUnknown");
    if (import.meta.env.DEV) {
      console.warn("[SesameKey] Unknown error type");
    }
  }
}
