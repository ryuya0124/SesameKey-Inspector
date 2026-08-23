/**
 * Web Worker エントリーポイント
 *
 * 画像処理とQRデコードをメインスレッドから分離する。
 * UIスレッドをブロックせずに重い処理を実行できる。
 *
 * メッセージ形式:
 *   Main → Worker: DecodeRequest
 *   Worker → Main: DecodeResponse (progress / result)
 */

import { decodeQr } from "./decoder.ts";
import { bitmapToImageData, preprocessingPipeline } from "./preprocess.ts";

/** メインスレッドから受け取るリクエスト */
export interface DecodeRequest {
  type: "decode";
  bitmap: ImageBitmap;
}

/** Worker から送るレスポンス */
export type DecodeResponse =
  | { type: "progress"; stage: string }
  | { type: "success"; qrText: string; stage: string }
  | { type: "failure"; reason: "not_found" | "decode_failed" };

/**
 * QRデコードの完全パイプライン
 * Original → 各前処理 の順で試行し、成功したら即座に結果を返す
 */
async function runDecodePipeline(bitmap: ImageBitmap): Promise<void> {
  // 元画像を解析用サイズに変換
  const originalImageData = bitmapToImageData(bitmap);

  // 前処理パイプラインを順番に試行
  for (const { imageData, label } of preprocessingPipeline(originalImageData)) {
    // 進捗をメインスレッドへ通知
    const progress: DecodeResponse = { type: "progress", stage: label };
    self.postMessage(progress);

    const result = await decodeQr(imageData);

    if (result !== null) {
      // デコード成功: 結果を返してループを終了
      const success: DecodeResponse = {
        type: "success",
        qrText: result,
        stage: label,
      };
      self.postMessage(success);
      return;
    }
  }

  // すべての前処理を試してもデコードできなかった
  const failure: DecodeResponse = { type: "failure", reason: "not_found" };
  self.postMessage(failure);
}

// Worker のメッセージハンドラー
self.addEventListener("message", async (event: MessageEvent<DecodeRequest>) => {
  const { type, bitmap } = event.data;

  if (type === "decode") {
    try {
      await runDecodePipeline(bitmap);
    } catch {
      const failure: DecodeResponse = {
        type: "failure",
        reason: "decode_failed",
      };
      self.postMessage(failure);
    } finally {
      // ImageBitmap は使用後に解放してメモリを節約する
      bitmap.close();
    }
  }
});
