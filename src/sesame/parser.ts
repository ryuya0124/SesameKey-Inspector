/**
 * SESAME バイナリデータパーサー
 *
 * Base64URLデコード後の Uint8Array を解析して SesameDeviceInfo を生成する。
 *
 * バイナリ構造 (CANDY HOUSE公式 + コミュニティ調査による確認済み仕様):
 *   byte  0     : Product Model (デバイスタイプ番号)
 *   byte  1-16  : Secret Key (16 bytes)
 * OS2形式 (99 bytes):
 *   byte  17-80 : Public Key (64 bytes)
 *   byte  81-82 : Key Index (2 bytes, little-endian)
 *   byte  83-98 : Device UUID (16 bytes)
 *
 * OS3コンパクト形式 (39 bytes):
 *   byte  17-20 : Public Key (4 bytes)
 *   byte  21-22 : Key Index (2 bytes, little-endian)
 *   byte  23-38 : Device UUID (16 bytes)
 */

import { SesameError, SesameErrorCode } from "../errors.ts";
import { decodeBase64Url, toHexString } from "./base64url.ts";
import { getModelName, type SesameDeviceInfo } from "./models.ts";
import { type SsmUri } from "./uri.ts";

/** SESAME QRデータの最小バイト数 */
const MIN_PAYLOAD_BYTES = 17; // model (1) + secret key (16)

/** 完全なペイロードのバイト数 */
const FULL_PAYLOAD_BYTES = 99;

/** SESAME OS3のコンパクトペイロード長 */
const COMPACT_PAYLOAD_BYTES = 39;

/** 各フィールドのオフセットと長さ (確認済み仕様) */
const OFFSETS = {
  model: { start: 0, length: 1 },
  secretKey: { start: 1, length: 16 },
  publicKey: { start: 17, length: 64 },
  keyIndex: { start: 81, length: 2 },
  uuid: { start: 83, length: 16 },
} as const;

const COMPACT_OFFSETS = {
  publicKey: { start: 17, length: 4 },
  keyIndex: { start: 21, length: 2 },
  uuid: { start: 23, length: 16 },
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

  // 10分限定の暗号化QRは、共有鍵本体ではなく16 bytesの交換トークンを持つ。
  // 復号にはCANDY HOUSEの認証済みAPIが必要なため、クライアント単体では扱わない。
  if (bytes.length === 16) {
    throw new SesameError(
      SesameErrorCode.ENCRYPTED_QR_UNSUPPORTED,
      "Encrypted SESAME QR token detected",
    );
  }

  // 最小バイト数チェック
  if (bytes.length < MIN_PAYLOAD_BYTES) {
    throw new SesameError(
      SesameErrorCode.INVALID_SESAME_DATA,
      `Decoded data too short: expected at least ${MIN_PAYLOAD_BYTES} bytes, got ${bytes.length}`,
    );
  }

  // 現在確認できている共有鍵QRはOS3の39 bytesかOS2の99 bytes。
  if (bytes.length !== COMPACT_PAYLOAD_BYTES && bytes.length !== FULL_PAYLOAD_BYTES) {
    throw new SesameError(
      SesameErrorCode.INVALID_SESAME_DATA,
      `Unsupported SESAME payload length: ${bytes.length}`,
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

  const layout = bytes.length >= FULL_PAYLOAD_BYTES
    ? OFFSETS
    : bytes.length >= COMPACT_PAYLOAD_BYTES
      ? COMPACT_OFFSETS
      : null;

  // Public Key — OS2は64 bytes、OS3コンパクト形式は4 bytes
  const publicKey = layout
    ? bytes.slice(
        layout.publicKey.start,
        layout.publicKey.start + layout.publicKey.length,
      )
    : new Uint8Array(0);

  // Key Index (byte 81-82) — little-endian uint16
  let keyIndex = 0;
  if (layout) {
    keyIndex =
      bytes[layout.keyIndex.start] |
      (bytes[layout.keyIndex.start + 1] << 8);
  }

  // UUID (byte 83-98)
  const uuid = layout
    ? bytes.slice(
        layout.uuid.start,
        layout.uuid.start + layout.uuid.length,
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
