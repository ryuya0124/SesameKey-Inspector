/**
 * SESAMEデバイスのProductModel（タイプ番号）定義
 * CANDY HOUSE 公式ドキュメントおよびSesameSDKより確認
 */
export const ProductModel = {
  Sesame3: 0,
  WiFiModule2: 1,
  SesameBot1: 2,
  SesameBike1: 3,
  Sesame4: 4,
  Sesame5: 5,
  SesameBike2: 6,
  Sesame5Pro: 7,
  OpenSensor: 8,
  SesameTouch1Pro: 9,
  SesameTouch1: 10,
  BleConnector: 11,
  Hub3: 13,
  SesameRemote: 14,
  RemoteNano: 15,
  Sesame5USA: 16,
  SesameBot2: 17,
  F2: 18,
  F1: 19,
  SesameBot3: 35, // Bot 2と同じ制御実装だがProduct Modelは別
} as const;
export type ProductModel = typeof ProductModel[keyof typeof ProductModel];

/**
 * デバイスタイプが「鍵」（Lock / Bot）系かどうかを判定する
 */
export function isLockDevice(model: number): boolean {
  return (
    model === ProductModel.Sesame3 ||
    model === ProductModel.Sesame4 ||
    model === ProductModel.Sesame5 ||
    model === ProductModel.Sesame5Pro ||
    model === ProductModel.Sesame5USA
  );
}

/**
 * デバイスタイプが「Bot」系かどうかを判定する
 */
export function isBotDevice(model: number): boolean {
  return (
    model === ProductModel.SesameBot1 ||
    model === ProductModel.SesameBot2 ||
    model === ProductModel.SesameBot3
  );
}

/** デバイスモデル番号から表示名を返す */
export function getModelName(model: number): string {
  switch (model) {
    case ProductModel.Sesame3:       return "Sesame 3";
    case ProductModel.WiFiModule2:   return "WiFi Module 2";
    case ProductModel.SesameBot1:    return "Sesame Bot 1";
    case ProductModel.SesameBike1:   return "Sesame Bike 1";
    case ProductModel.Sesame4:       return "Sesame 4";
    case ProductModel.Sesame5:       return "Sesame 5";
    case ProductModel.SesameBike2:   return "Sesame Bike 2";
    case ProductModel.Sesame5Pro:    return "Sesame 5 Pro";
    case ProductModel.OpenSensor:    return "Open Sensor";
    case ProductModel.SesameTouch1Pro: return "Sesame Touch 1 Pro";
    case ProductModel.SesameTouch1:  return "Sesame Touch 1";
    case ProductModel.BleConnector:  return "BLE Connector";
    case ProductModel.Hub3:          return "Hub 3";
    case ProductModel.SesameRemote:  return "Sesame Remote";
    case ProductModel.RemoteNano:    return "Remote Nano";
    case ProductModel.Sesame5USA:    return "Sesame 5 (USA)";
    case ProductModel.SesameBot2:    return "Sesame Bot 2";
    case ProductModel.F2:            return "F2";
    case ProductModel.F1:            return "F1";
    case ProductModel.SesameBot3:    return "Sesame Bot 3";
    default:                         return `Unknown (type=${model})`;
  }
}

/**
 * QRコードから解析されたSESAMEデバイス情報
 */
export interface SesameDeviceInfo {
  /** デバイスタイプ番号（byte 0） */
  model: number;
  /** デバイス表示名 */
  modelName: string;
  /** Secret Key（16バイト） */
  secretKey: Uint8Array;
  /** Secret Key の16進数文字列表現 */
  secretKeyHex: string;
  /** Public Key（64バイト） */
  publicKey: Uint8Array;
  /** Key Index（2バイト, little-endian） */
  keyIndex: number;
  /** デバイスUUID（16バイト） */
  uuid: Uint8Array;
  /** デバイスUUID の標準ハイフン付き文字列表現 */
  uuidString: string;
  /** デバイス名（URIのnパラメータ） */
  deviceName?: string;
  /** アクセス権限レベル（URIのlパラメータ）: 0=Owner, 1=Manager, 2=Guest */
  accessLevel?: number;
}
