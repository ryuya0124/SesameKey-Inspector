/**
 * Base64URL デコーダー
 *
 * SESAMEのQRコード内 sk パラメータは Base64URL 形式。
 * 標準Base64との差異:
 *   + → -
 *   / → _
 * padding (=) が省略されている場合も対応する。
 *
 * 既存の "Unable to parse base64 string" エラーを解消するため、
 * 通常のBase64デコーダーへ渡す前に必ず正規化する。
 */

import { SesameError, SesameErrorCode } from "../errors.ts";

/**
 * Base64URL文字列をUint8Arrayにデコードする
 * @param value Base64URL文字列（padding省略可）
 * @returns デコードされたバイト列
 * @throws {SesameError} 不正なBase64URL文字列の場合
 */
export function decodeBase64Url(value: string): Uint8Array {
  if (!value || value.length === 0) {
    throw new SesameError(
      SesameErrorCode.INVALID_BASE64URL,
      "Base64URL string is empty",
    );
  }

  // Base64URL → 標準Base64 に変換
  // - → +, _ → /
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");

  // padding が省略されている場合に補完
  // Base64は4文字単位なので、length % 4 に応じて = を追加する
  const paddingLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + "=".repeat(paddingLength);

  // atob でバイナリ文字列に変換
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    // atob が失敗した場合 (不正な文字など)
    throw new SesameError(
      SesameErrorCode.INVALID_BASE64URL,
      `Failed to decode Base64URL: contains invalid characters`,
    );
  }

  // バイナリ文字列を Uint8Array に変換
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

/**
 * Uint8Array を16進数文字列に変換する
 * @param bytes バイト列
 * @param separator バイト間の区切り文字 (デフォルト: なし)
 */
export function toHexString(bytes: Uint8Array, separator = ""): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(separator);
}
