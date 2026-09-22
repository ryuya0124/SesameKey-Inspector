/**
 * SesameKey Inspector — アプリエントリーポイント
 *
 * パイプライン:
 *   画像入力 → Web Worker (QRデコード) → ssm://URI → SESAMEパーサー → 結果表示
 *
 * セキュリティ:
 *   - QR画像 / URI / sk / Secret はすべてブラウザ内だけで処理
 *   - Cloudflare Workerへは静的ファイルの取得のみ
 *   - console / localStorage / URL へ Secret を絶対に出力しない
 */

import "./style.css";

import { t, getLang, setLang, toggleLang } from "./i18n/index.ts";
import { initUpload } from "./ui/upload.ts";
import { renderResult, clearResult } from "./ui/result.ts";
import { renderError } from "./ui/error.ts";
import { parseSsmUri } from "./sesame/uri.ts";
import { parseSesameData } from "./sesame/parser.ts";
import { SesameError, SesameErrorCode } from "./errors.ts";
import type { DecodeResponse } from "./qr/worker-entry.ts";

// ---- セクション要素 ----
const sectionUpload   = document.getElementById("section-upload")!;
const sectionAnalyzing = document.getElementById("section-analyzing")!;
const sectionResult   = document.getElementById("section-result")!;
const sectionError    = document.getElementById("section-error")!;
const analyzingStageEl = document.getElementById("analyzing-stage")!;

/** 表示するセクションを切り替える */
function showSection(section: "upload" | "analyzing" | "result" | "error"): void {
  sectionUpload.classList.toggle("hidden",    section !== "upload");
  sectionAnalyzing.classList.toggle("hidden", section !== "analyzing");
  sectionResult.classList.toggle("hidden",    section !== "result");
  sectionError.classList.toggle("hidden",     section !== "error");
}

/** 解析中ステージのテキストを更新する */
function updateAnalyzingStage(stage: string): void {
  analyzingStageEl.textContent = t("analyzingStage", { stage });
}

// ---- Web Worker ----
/** QRデコードに使用するWorkerのシングルトン */
let worker: Worker | null = null;

function getWorker(): Worker {
  if (!worker) {
    // Vite の ?worker 構文でバンドルに含める
    worker = new Worker(
      new URL("./qr/worker-entry.ts", import.meta.url),
      { type: "module" },
    );
  }
  return worker;
}

/**
 * 画像が選択されたときのメイン処理
 * Web Worker へ ImageBitmap を送ってQRデコードを開始する
 */
async function handleImageSelected(bitmap: ImageBitmap): Promise<void> {
  // 前の結果をクリア
  clearResult();
  showSection("analyzing");
  updateAnalyzingStage("original");

  const w = getWorker();

  return new Promise<void>((resolve) => {
    // Worker からのメッセージを受け取る
    const onMessage = async (event: MessageEvent<DecodeResponse>) => {
      const data = event.data;

      switch (data.type) {
        case "progress":
          updateAnalyzingStage(data.stage);
          break;

        case "success": {
          // QRデコード成功 → SESAME URI解析へ
          w.removeEventListener("message", onMessage);
          w.removeEventListener("error", onError);

          const qrText = data.qrText;
          const stage = data.stage;

          try {
            // ssm:// URI 解析
            const ssmUri = parseSsmUri(qrText);

            // バイナリ解析 → SesameDeviceInfo
            const deviceInfo = parseSesameData(ssmUri);

            // 結果表示
            renderResult(deviceInfo, stage, qrText);
            showSection("result");
          } catch (err) {
            renderError(err);
            showSection("error");
          }
          resolve();
          break;
        }

        case "failure": {
          w.removeEventListener("message", onMessage);
          w.removeEventListener("error", onError);

          const errorCode =
            data.reason === "not_found"
              ? SesameErrorCode.QR_NOT_FOUND
              : SesameErrorCode.QR_DECODE_FAILED;

          renderError(new SesameError(errorCode, `QR decode: ${data.reason}`));
          showSection("error");
          resolve();
          break;
        }
      }
    };

    const onError = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      renderError(new SesameError(SesameErrorCode.QR_DECODE_FAILED, "Worker error"));
      showSection("error");
      resolve();
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);

    // ImageBitmap を Worker へ転送 (コピーではなく所有権移転でメモリ節約)
    w.postMessage({ type: "decode", bitmap }, [bitmap]);
  });
}

/** 結果/エラーからリセットしてアップロード画面に戻る */
function handleReset(): void {
  clearResult();
  showSection("upload");
}

// ---- 初期化 ----
function init(): void {
  // HTML の lang 属性を初期化
  document.documentElement.lang = getLang();

  // 初回表示時に全ての data-i18n 要素を正しい言語に書き換える
  // これにより HTML のハードコード文字列がユーザー言語設定で上書きされる
  setLang(getLang());

  // 初期表示
  showSection("upload");

  // アップロードイベント登録
  initUpload(handleImageSelected);

  // 「別の画像を解析」ボタン
  document.getElementById("btn-reset")?.addEventListener("click", handleReset);
  document.getElementById("btn-retry")?.addEventListener("click", handleReset);

  // 言語切り替えボタン
  const btnLang = document.getElementById("btn-lang");
  const langLabel = document.getElementById("lang-label");
  if (btnLang && langLabel) {
    // 初期表示
    langLabel.textContent = getLang() === "ja" ? "EN" : "JA";

    btnLang.addEventListener("click", () => {
      toggleLang();
      langLabel.textContent = getLang() === "ja" ? "EN" : "JA";

      // 現在表示中の動的テキストを更新
      const stage = analyzingStageEl.textContent;
      if (stage) {
        updateAnalyzingStage(stage.replace(/^.*: /, ""));
      }
    });
  }
}

// DOM が準備できたら初期化
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
