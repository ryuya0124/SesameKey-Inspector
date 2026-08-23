/**
 * ssm:// URI パーサー
 *
 * SESAMEのQRコードに含まれるURIを解析する。
 * 例: ssm://UI?t=sk&sk=BASE64URL&l=0&n=デバイス名
 *
 * 標準の URL / URLSearchParams を使用することで、
 * URL エンコードされた文字列も正しく処理する。
 */

import { SesameError, SesameErrorCode } from "../errors.ts";

/** ssm:// URI から解析した値 */
export interface SsmUri {
  /** t パラメータ (通常 "sk") */
  type: string;
  /** sk パラメータ (Base64URL エンコードされた鍵データ) */
  sk: string;
  /** l パラメータ (アクセス権限: 0=Owner, 1=Manager, 2=Guest) */
  accessLevel?: number;
  /** n パラメータ (デバイス名) */
  deviceName?: string;
}

/**
 * QRコードから取得した文字列を解析して ssm:// URIの各パラメータを返す
 * @param rawText QRコードから取得した生の文字列
 * @throws {SesameError} URIが不正な場合
 */
export function parseSsmUri(rawText: string): SsmUri {
  // ssm:// スキームの確認
  if (!rawText.startsWith("ssm://")) {
    throw new SesameError(
      SesameErrorCode.INVALID_URI,
      `URI scheme is not ssm:// (got: ${rawText.slice(0, 20)}...)`,
    );
  }

  // URL として解析するため ssm:// を https:// に一時置換
  // (ブラウザの URL parser は ssm:// を "opaque" として扱い query string を返さない場合がある)
  let url: URL;
  try {
    const normalized = rawText.replace(/^ssm:\/\//, "https://sesame-dummy/");
    url = new URL(normalized);
  } catch {
    throw new SesameError(
      SesameErrorCode.INVALID_URI,
      "Failed to parse ssm:// URI structure",
    );
  }

  const params = url.searchParams;

  // t パラメータの確認
  const type = params.get("t");
  if (!type) {
    throw new SesameError(
      SesameErrorCode.INVALID_URI,
      "Missing 't' parameter in ssm:// URI",
    );
  }

  // sk パラメータの確認
  const sk = params.get("sk");
  if (!sk) {
    throw new SesameError(
      SesameErrorCode.MISSING_SK,
      "Missing 'sk' parameter in ssm:// URI",
    );
  }

  if (sk.trim().length === 0) {
    throw new SesameError(
      SesameErrorCode.MISSING_SK,
      "'sk' parameter is empty",
    );
  }

  // オプションパラメータの取得
  const levelStr = params.get("l");
  const accessLevel =
    levelStr !== null ? parseInt(levelStr, 10) : undefined;

  const deviceName = params.get("n") ?? undefined;

  return {
    type,
    sk,
    accessLevel: Number.isFinite(accessLevel) ? accessLevel : undefined,
    deviceName,
  };
}
