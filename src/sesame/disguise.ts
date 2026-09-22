/**
 * SESAME Bot 3の共有鍵QRを、Bot 2として扱うURIへ変換する。
 *
 * Bot 2 / Bot 3は同じ制御実装を使用しているため、Product Modelだけを
 * 35 (Bot 3) から17 (Bot 2)へ置換する。Secret、UUID、権限、名前など、
 * それ以外の情報は変更しない。
 */

import { decodeBase64Url, encodeBase64 } from "./base64url.ts";
import { ProductModel } from "./models.ts";
import { parseSsmUri } from "./uri.ts";

const SK_PARAM_PATTERN = /([?&]sk=)([^&#]*)/;

export function disguiseBot3AsBot2(rawUri: string): string {
  const parsed = parseSsmUri(rawUri);
  const original = decodeBase64Url(parsed.sk);

  if (original.length < 17 || original[0] !== ProductModel.SesameBot3) {
    throw new Error("The QR code is not for SESAME Bot 3");
  }

  const disguised = original.slice();
  disguised[0] = ProductModel.SesameBot2;
  const encoded = encodeURIComponent(encodeBase64(disguised));
  const result = rawUri.replace(SK_PARAM_PATTERN, `$1${encoded}`);

  if (result === rawUri) {
    throw new Error("Failed to replace the sk parameter");
  }

  // 変換後に「先頭1 byte以外が同一」であることをその場で検証する。
  const verified = decodeBase64Url(parseSsmUri(result).sk);
  if (
    verified.length !== original.length ||
    verified[0] !== ProductModel.SesameBot2 ||
    !original.subarray(1).every((byte, index) => byte === verified[index + 1])
  ) {
    throw new Error("Disguised QR verification failed");
  }

  return result;
}
