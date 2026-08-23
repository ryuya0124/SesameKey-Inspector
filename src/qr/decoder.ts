/**
 * QRデコーダー
 *
 * デコード戦略 (優先順位):
 *   1. BarcodeDetector API (Chrome/Edge/Android Chrome — バンドルサイズ0)
 *   2. qr-scanner (nimiq製, ~25KB, lazy-load)
 *
 * どちらも失敗した場合は null を返す。
 * 呼び出し元 (worker-entry.ts) が前処理パイプラインを試行する。
 */

/** BarcodeDetector の型定義 (lib.dom.d.ts に未収録のため手動定義) */
interface BarcodeDetectorResult {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: ReadonlyArray<{ x: number; y: number }>;
}

declare class BarcodeDetector {
  static getSupportedFormats(): Promise<string[]>;
  constructor(options?: { formats: string[] });
  detect(image: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}

/** BarcodeDetector API が qr_code をサポートしているかのキャッシュ */
let barcodeDetectorSupported: boolean | null = null;
let barcodeDetectorInstance: BarcodeDetector | null = null;

/**
 * BarcodeDetector が利用可能かを確認し、インスタンスを返す
 */
async function getBarcodeDetector(): Promise<BarcodeDetector | null> {
  if (barcodeDetectorSupported === false) return null;
  if (barcodeDetectorInstance) return barcodeDetectorInstance;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (globalThis as unknown as Record<string, unknown>)["BarcodeDetector"] === "undefined") {
      barcodeDetectorSupported = false;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formats = await (globalThis as unknown as { BarcodeDetector: { getSupportedFormats(): Promise<string[]> } }).BarcodeDetector.getSupportedFormats();
    if (!formats.includes("qr_code")) {
      barcodeDetectorSupported = false;
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    barcodeDetectorInstance = new (globalThis as unknown as { BarcodeDetector: new (opts: { formats: string[] }) => BarcodeDetector }).BarcodeDetector({
      formats: ["qr_code"],
    });
    barcodeDetectorSupported = true;
    return barcodeDetectorInstance;
  } catch {
    barcodeDetectorSupported = false;
    return null;
  }
}

/**
 * BarcodeDetector API で QR コードをデコードする
 * @returns QRコードの文字列、または null
 */
async function decodeWithBarcodeDetector(
  imageData: ImageData,
): Promise<string | null> {
  const detector = await getBarcodeDetector();
  if (!detector) return null;

  try {
    // ImageData → ImageBitmap に変換して BarcodeDetector へ渡す
    const bitmap = await createImageBitmap(imageData);
    const results = await detector.detect(bitmap);
    bitmap.close();

    if (results.length > 0 && results[0].rawValue) {
      return results[0].rawValue;
    }
    return null;
  } catch {
    return null;
  }
}

/** qr-scanner のキャッシュ（遅延インポート）*/
let qrScannerModule: typeof import("qr-scanner") | null = null;

/**
 * qr-scanner ライブラリを lazy-load する
 */
async function getQrScanner(): Promise<typeof import("qr-scanner") | null> {
  if (qrScannerModule) return qrScannerModule;
  try {
    qrScannerModule = await import("qr-scanner");
    return qrScannerModule;
  } catch {
    return null;
  }
}

/**
 * qr-scanner ライブラリで QR コードをデコードする
 * @returns QRコードの文字列、または null
 */
async function decodeWithQrScanner(
  imageData: ImageData,
): Promise<string | null> {
  const QrScanner = await getQrScanner();
  if (!QrScanner) return null;

  try {
    // ImageData → Blob → File に変換して QrScanner.scanImage へ渡す
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D;
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const file = new File([blob], "qr.png", { type: "image/png" });

    // qr-scanner の型定義に合わせてキャスト
    const result = await (QrScanner as unknown as {
      default: { scanImage: (file: File, options?: { returnDetailedScanResult?: boolean }) => Promise<{ data: string }> };
    }).default.scanImage(file, { returnDetailedScanResult: true });

    return result?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * ImageData から QR コードをデコードする
 * BarcodeDetector → qr-scanner の順で試行する
 *
 * @param imageData デコード対象のImageData
 * @returns QRコードの文字列、または null（デコード失敗）
 */
export async function decodeQr(imageData: ImageData): Promise<string | null> {
  // 第1段階: BarcodeDetector API (ネイティブ, ゼロコスト)
  const nativeResult = await decodeWithBarcodeDetector(imageData);
  if (nativeResult !== null) return nativeResult;

  // 第2段階: qr-scanner (フォールバック)
  const qrScannerResult = await decodeWithQrScanner(imageData);
  if (qrScannerResult !== null) return qrScannerResult;

  return null;
}
