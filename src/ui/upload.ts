/**
 * ファイル入力 / ドラッグ&ドロップ / クリップボード貼り付け処理
 *
 * 受け取った画像ファイルを ImageBitmap に変換して
 * コールバックへ渡す。
 */

import { t } from "../i18n/index.ts";

/** 画像が選択されたときのコールバック */
export type ImageSelectedCallback = (bitmap: ImageBitmap) => void;

/** サポートする最大ファイルサイズ (20MB) */
const MAX_FILE_SIZE = 20 * 1024 * 1024;

/** ドロップゾーン要素 */
let dropZoneEl: HTMLElement | null = null;

/**
 * ファイルから ImageBitmap を生成する
 * サポートされていない形式はブラウザのデコード機能に依存する
 */
async function fileToImageBitmap(file: File): Promise<ImageBitmap | null> {
  if (!file.type.startsWith("image/")) {
    showDropZoneError("Not an image file");
    return null;
  }

  if (file.size > MAX_FILE_SIZE) {
    showDropZoneError("File too large (max 20MB)");
    return null;
  }

  try {
    return await createImageBitmap(file);
  } catch {
    // createImageBitmap が失敗した場合 (一部HEIC等) は Image 経由でリトライ
    try {
      const url = URL.createObjectURL(file);
      const img = new Image();
      return await new Promise<ImageBitmap>((resolve, reject) => {
        img.onload = async () => {
          try {
            const bitmap = await createImageBitmap(img);
            URL.revokeObjectURL(url);
            resolve(bitmap);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Image load failed"));
        };
        img.src = url;
      });
    } catch {
      showDropZoneError("Failed to decode image");
      return null;
    }
  }
}

/** ドロップゾーンに一時的なエラースタイルを表示する */
function showDropZoneError(msg: string): void {
  if (!dropZoneEl) return;
  console.warn("[SesameKey] Image error:", msg); // Secret含まない
  dropZoneEl.classList.add("error");
  setTimeout(() => dropZoneEl?.classList.remove("error"), 1500);
}

/**
 * アップロード関連のイベントリスナーを登録する
 */
export function initUpload(onImageSelected: ImageSelectedCallback): void {
  const dropZone = document.getElementById("drop-zone") as HTMLElement;
  const fileInput = document.getElementById("file-input") as HTMLInputElement;
  const btnSelect = document.getElementById("btn-file-select") as HTMLButtonElement;
  const dropOverlay = document.getElementById("drop-overlay") as HTMLElement;

  dropZoneEl = dropZone;

  if (!dropZone || !fileInput || !btnSelect) return;

  // ドラッグカウンター (子要素への dragenter/dragleave のノイズを除去)
  let dragDepth = 0;

  // -- ファイル選択ボタン --
  btnSelect.addEventListener("click", (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    fileInput.value = ""; // 同じファイルを再選択できるようリセット
    const bitmap = await fileToImageBitmap(file);
    if (bitmap) onImageSelected(bitmap);
  });

  // -- ドラッグ&ドロップ --
  dropZone.addEventListener("dragenter", (e) => {
    e.preventDefault();
    dragDepth++;
    dropZone.classList.add("dragging");
    if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "false");
  });

  dropZone.addEventListener("dragleave", () => {
    dragDepth--;
    if (dragDepth <= 0) {
      dragDepth = 0;
      dropZone.classList.remove("dragging");
      if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "true");
    }
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = "copy";
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dragDepth = 0;
    dropZone.classList.remove("dragging");
    if (dropOverlay) dropOverlay.setAttribute("aria-hidden", "true");

    const file = e.dataTransfer?.files[0];
    if (!file) return;
    const bitmap = await fileToImageBitmap(file);
    if (bitmap) onImageSelected(bitmap);
  });

  // -- キーボード操作でドロップゾーンをクリック --
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });

  // -- クリップボード貼り付け (Ctrl+V / Cmd+V) --
  document.addEventListener("paste", async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const bitmap = await fileToImageBitmap(file);
        if (bitmap) {
          onImageSelected(bitmap);
          return;
        }
      }
    }
  });

  // ドロップゾーンのクリック (ボタン以外の部分)
  dropZone.addEventListener("click", (e) => {
    if (e.target === btnSelect) return;
    fileInput.click();
  });

  // ドロップゾーンのaria-labelを翻訳に連動
  dropZone.setAttribute(
    "aria-label",
    t("uploadDesc"),
  );
}
