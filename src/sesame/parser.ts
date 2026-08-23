/**
 * SESAME バイナリデータパーサー
 *
 * Base64URLデコード後の Uint8Array を解析して SesameDeviceInfo を生成する。
 *
 * バイナリ構造 (CANDY HOUSE公式 + コミュニティ調査による確認済み仕様):
 *   byte  0     : Product Model (デバイスタイプ番号)
 *   byte  1-16  : Secret Key (16 bytes)
 *   byte  17-80 : Public Key (64 bytes)
 *   byte  81-82 : Key Index (2 bytes, little-endian)
 *   byte  83-98 : Device UUID (16 bytes)
 *   合計        : 99 bytes
 */

import { SesameError, SesameErrorCode } from "../errors.ts";
import { decodeBase64Url, toHexString } from "./base64url.ts";
import { getModelName, type SesameDeviceInfo } from "./models.ts";
import { type SsmUri } from "./uri.ts";

/** SESAME QRデータの最小バイト数 */
const MIN_PAYLOAD_BYTES = 17; // model (1) + secret key (16)

/** 完全なペイロードのバイト数 */
const FULL_PAYLOAD_BYTES = 99;

/** 各フィールドのオフセットと長さ (確認済み仕様) */
const OFFSETS = {
  model: { start: 0, length: 1 },
  secretKey: { start: 1, length: 16 },
  publicKey: { start: 17, length: 64 },
  keyIndex: { start: 81, length: 2 },
  uuid: { start: 83, length: 16 },
} as const;

/**
 * 16バイトのUUID バイト列を標準ハイフン付き文字列に変換する
 * 形式: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
function formatUuid(bytes: Uint8Array): string {
  const hex = toHexString(bytes);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

/**
 * ssm:// URI の sk パラメータからデバイス情報を解析する
 * @param ssmUri parseSsmUri() の結果
 * @returns SesameDeviceInfo
 * @throws {SesameError} データが不正な場合
 */
export function parseSesameData(ssmUri: SsmUri): SesameDeviceInfo {
  // Base64URL デコード
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64Url(ssmUri.sk);
  } catch (err) {
    if (err instanceof SesameError) throw err;
    throw new SesameError(
      SesameErrorCode.INVALID_BASE64URL,
      "Base64URL decode failed",
    );
  }

  // 最小バイト数チェック
  if (bytes.length < MIN_PAYLOAD_BYTES) {
    throw new SesameError(
      SesameErrorCode.INVALID_SESAME_DATA,
      `Decoded data too short: expected at least ${MIN_PAYLOAD_BYTES} bytes, got ${bytes.length}`,
    );
  }

  // モデル番号取得 (byte 0)
  const model = bytes[OFFSETS.model.start];

  // Secret Key 抽出 (byte 1-16)
  let secretKey: Uint8Array;
  try {
    secretKey = bytes.slice(
      OFFSETS.secretKey.start,
      OFFSETS.secretKey.start + OFFSETS.secretKey.length,
    );
    if (secretKey.length !== 16) {
      throw new Error("Unexpected secret key length");
    }
  } catch {
    throw new SesameError(
      SesameErrorCode.SECRET_EXTRACTION_FAILED,
      "Failed to extract secret key from decoded data",
    );
  }

  const secretKeyHex = toHexString(secretKey);

  // Public Key (byte 17-80) — 存在する場合のみ
  const publicKey =
    bytes.length >= OFFSETS.publicKey.start + OFFSETS.publicKey.length
      ? bytes.slice(
          OFFSETS.publicKey.start,
          OFFSETS.publicKey.start + OFFSETS.publicKey.length,
        )
      : new Uint8Array(0);

  // Key Index (byte 81-82) — little-endian uint16
  let keyIndex = 0;
  if (bytes.length >= OFFSETS.keyIndex.start + OFFSETS.keyIndex.length) {
    keyIndex =
      bytes[OFFSETS.keyIndex.start] |
      (bytes[OFFSETS.keyIndex.start + 1] << 8);
  }

  // UUID (byte 83-98)
  const uuid =
    bytes.length >= FULL_PAYLOAD_BYTES
      ? bytes.slice(
          OFFSETS.uuid.start,
          OFFSETS.uuid.start + OFFSETS.uuid.length,
        )
      : new Uint8Array(0);

  const uuidString = uuid.length === 16 ? formatUuid(uuid) : "";

  return {
    model,
    modelName: getModelName(model),
    secretKey,
    secretKeyHex,
    publicKey,
    keyIndex,
    uuid,
    uuidString,
    deviceName: ssmUri.deviceName,
    accessLevel: ssmUri.accessLevel,
  };
}
