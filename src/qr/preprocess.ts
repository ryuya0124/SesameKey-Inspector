/**
 * 画像前処理パイプライン
 *
 * QRデコードが失敗した場合に、段階的に画像を変換して再試行する。
 * 成功した時点で即座に処理を終了し、メモリを節約する。
 *
 * 処理順序:
 *   1. Original
 *   2. Grayscale
 *   3. 2x nearest-neighbor upscale
 *   4. 4x nearest-neighbor upscale
 *   5. Quiet Zone 追加
 *   6. Threshold (二値化)
 *   7. Inverted
 */

/** QRデコード用にCanvasから取得したImageData */
export interface ProcessedImage {
  imageData: ImageData;
  label: string;
}

/** OffscreenCanvas が使えない環境向けのフォールバック型 */
type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyCtx =
  | OffscreenCanvasRenderingContext2D
  | CanvasRenderingContext2D;

/** 作業用Canvas/Contextを生成する */
function createCanvas(width: number, height: number): [AnyCanvas, AnyCtx] {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    }) as OffscreenCanvasRenderingContext2D;
    return [canvas, ctx];
  } else {
    // OffscreenCanvas非対応環境 (主にFirefox) では HTMLCanvasElement を使用
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    }) as CanvasRenderingContext2D;
    return [canvas, ctx];
  }
}

/** QR解析に適した最大サイズ (この値を超える場合は縮小する) */
const MAX_QR_SCAN_SIZE = 1024;

/** Quiet Zone として追加するピクセル幅 */
const QUIET_ZONE_SIZE = 40;

/**
 * 元のImageBitmapから解析用のImageDataを生成する
 * 長辺が MAX_QR_SCAN_SIZE を超える場合は等比縮小する
 */
export function bitmapToImageData(bitmap: ImageBitmap): ImageData {
  const { width, height } = bitmap;
  let targetW = width;
  let targetH = height;

  if (Math.max(width, height) > MAX_QR_SCAN_SIZE) {
    const scale = MAX_QR_SCAN_SIZE / Math.max(width, height);
    targetW = Math.round(width * scale);
    targetH = Math.round(height * scale);
  }

  const [, ctx] = createCanvas(targetW, targetH);
  ctx.drawImage(bitmap, 0, 0, targetW, targetH);
  return ctx.getImageData(0, 0, targetW, targetH);
}

/**
 * ImageData をグレースケール変換する
 * 輝度計算: 0.299R + 0.587G + 0.114B (ITU-R BT.601)
 */
export function toGrayscale(imageData: ImageData): ImageData {
  const src = imageData.data;
  const out = new ImageData(imageData.width, imageData.height);
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = (0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2]) | 0;
    dst[i] = gray;
    dst[i + 1] = gray;
    dst[i + 2] = gray;
    dst[i + 3] = src[i + 3]; // alpha を保持
  }

  return out;
}

/**
 * nearest-neighbor アップスケール
 * QRコードが小さい場合に情報量を失わずに拡大する
 */
export function nearestNeighborUpscale(
  imageData: ImageData,
  scale: number,
): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const src = imageData.data;
  const out = new ImageData(dstW, dstH);
  const dst = out.data;

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.floor(y / scale);
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.floor(x / scale);
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }

  return out;
}

/**
 * 白いQuiet Zoneを周囲に追加する
 * スクリーンショット内のQRコードはQuiet Zoneが狭いことが多い
 */
export function addQuietZone(
  imageData: ImageData,
  padding: number = QUIET_ZONE_SIZE,
): ImageData {
  const srcW = imageData.width;
  const srcH = imageData.height;
  const dstW = srcW + padding * 2;
  const dstH = srcH + padding * 2;

  const out = new ImageData(dstW, dstH);
  const dst = out.data;

  // 白で初期化 (RGBA: 255,255,255,255)
  for (let i = 0; i < dst.length; i += 4) {
    dst[i] = 255;
    dst[i + 1] = 255;
    dst[i + 2] = 255;
    dst[i + 3] = 255;
  }

  // 元の画像を中央にコピー
  const src = imageData.data;
  for (let y = 0; y < srcH; y++) {
    for (let x = 0; x < srcW; x++) {
      const srcIdx = (y * srcW + x) * 4;
      const dstIdx = ((y + padding) * dstW + (x + padding)) * 4;
      dst[dstIdx] = src[srcIdx];
      dst[dstIdx + 1] = src[srcIdx + 1];
      dst[dstIdx + 2] = src[srcIdx + 2];
      dst[dstIdx + 3] = src[srcIdx + 3];
    }
  }

  return out;
}

/**
 * 二値化 (Threshold処理)
 * 輝度がしきい値以上のピクセルを白、未満を黒にする
 */
export function threshold(
  imageData: ImageData,
  thresholdValue: number = 128,
): ImageData {
  const src = imageData.data;
  const out = new ImageData(imageData.width, imageData.height);
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    const gray = (src[i] + src[i + 1] + src[i + 2]) / 3;
    const value = gray >= thresholdValue ? 255 : 0;
    dst[i] = value;
    dst[i + 1] = value;
    dst[i + 2] = value;
    dst[i + 3] = 255;
  }

  return out;
}

/**
 * 画像を色反転する
 * 黒背景のQRコードに対応するため
 */
export function invertColors(imageData: ImageData): ImageData {
  const src = imageData.data;
  const out = new ImageData(imageData.width, imageData.height);
  const dst = out.data;

  for (let i = 0; i < src.length; i += 4) {
    dst[i] = 255 - src[i];
    dst[i + 1] = 255 - src[i + 1];
    dst[i + 2] = 255 - src[i + 2];
    dst[i + 3] = src[i + 3];
  }

  return out;
}

/**
 * 前処理済み画像を順番に生成するジェネレーター
 * 成功した時点で呼び出し元が break することでメモリを節約する
 */
export function* preprocessingPipeline(
  original: ImageData,
): Generator<ProcessedImage> {
  // 1. オリジナル (既にリサイズ済み)
  yield { imageData: original, label: "original" };

  // 2. グレースケール
  const gray = toGrayscale(original);
  yield { imageData: gray, label: "grayscale" };

  // 3. 2x アップスケール (グレースケールから)
  yield {
    imageData: nearestNeighborUpscale(gray, 2),
    label: "2x upscale",
  };

  // 4. 4x アップスケール
  yield {
    imageData: nearestNeighborUpscale(gray, 4),
    label: "4x upscale",
  };

  // 5. Quiet Zone 追加 (元画像)
  yield {
    imageData: addQuietZone(original),
    label: "quiet zone",
  };

  // 6. 二値化
  yield {
    imageData: threshold(gray),
    label: "threshold",
  };

  // 7. 色反転
  yield {
    imageData: invertColors(gray),
    label: "inverted",
  };
}
