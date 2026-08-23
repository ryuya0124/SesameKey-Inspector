/**
 * 結果表示モジュール
 *
 * SesameDeviceInfo を受け取り、結果カードをDOMに描画する。
 * Secret Key はデフォルトでマスク表示し、「表示」ボタンで切り替える。
 * 「コピー」ボタンで Clipboard API に書き込む。
 *
 * Secret Key はこのモジュール内のメモリ上にのみ存在し、
 * console / localStorage / URL 等へは絶対に出力しない。
 */

import type { SesameDeviceInfo } from "../sesame/models.ts";
import { t } from "../i18n/index.ts";

/** コピー成功トーストの表示時間 (ms) */
const TOAST_DURATION = 2000;

/** 現在結果に表示中の SecretKey (メモリのみ) */
let currentSecretKeyHex: string | null = null;

/** Secret が表示状態かどうか */
let secretVisible = false;

/**
 * クリップボードへテキストをコピーし、トーストを表示する
 * Secret Key のコピーはここだけで行う
 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    showToast(t("btnCopied"));
  } catch {
    // Clipboard API が拒否された場合 (iOS Safari等)
    showToast("Copy failed");
  }
}

/** トースト通知を表示する */
function showToast(message: string): void {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast!.classList.remove("visible"), TOAST_DURATION);
}

/** アクセスレベルのラベルと CSS クラスを返す */
function getAccessLevelInfo(
  level?: number,
): { label: string; cssClass: string } {
  switch (level) {
    case 0:  return { label: t("accessOwner"),   cssClass: "owner" };
    case 1:  return { label: t("accessManager"), cssClass: "manager" };
    case 2:  return { label: t("accessGuest"),   cssClass: "guest" };
    default: return { label: t("accessUnknown"), cssClass: "" };
  }
}

/**
 * 結果カードを生成してDOMに挿入する
 */
export function renderResult(
  deviceInfo: SesameDeviceInfo,
  decodeStage: string,
): void {
  // メモリに Secret を保持 (ページリロードで消える)
  currentSecretKeyHex = deviceInfo.secretKeyHex;
  secretVisible = false;

  const container = document.getElementById("result-cards");
  if (!container) return;

  container.innerHTML = ""; // 前の結果をクリア

  // --- デバイスモデルカード ---
  const modelCard = createCard(
    t("labelModel"),
    `<span class="model-badge">${escapeHtml(deviceInfo.modelName)}</span>`,
    false,
  );
  container.appendChild(modelCard);

  // --- デバイス名カード (存在する場合のみ) ---
  if (deviceInfo.deviceName) {
    const nameCard = createCard(
      t("labelDeviceName"),
      `<span class="card-value">${escapeHtml(deviceInfo.deviceName)}</span>`,
      false,
    );
    container.appendChild(nameCard);
  }

  // --- アクセス権限カード ---
  if (deviceInfo.accessLevel !== undefined) {
    const { label, cssClass } = getAccessLevelInfo(deviceInfo.accessLevel);
    const accessCard = createCard(
      t("labelAccessLevel"),
      `<span class="access-badge ${escapeHtml(cssClass)}">${escapeHtml(label)}</span>`,
      false,
    );
    container.appendChild(accessCard);
  }

  // --- Secret Key カード (ハイライト) ---
  const secretCard = document.createElement("div");
  secretCard.className = "result-card highlight";

  const secretLabel = document.createElement("div");
  secretLabel.className = "card-label";
  secretLabel.textContent = t("labelSecretKey");

  const secretRow = document.createElement("div");
  secretRow.className = "secret-row";

  // Secret 値 (マスク表示)
  const secretValueEl = document.createElement("span");
  secretValueEl.id = "secret-value";
  secretValueEl.className = "secret-value";
  secretValueEl.textContent = t("secretMasked");
  secretValueEl.setAttribute("aria-label", t("labelSecretKey"));

  // コントロールボタン群
  const controls = document.createElement("div");
  controls.className = "secret-controls";

  // 「表示/非表示」ボタン
  const btnToggle = document.createElement("button");
  btnToggle.type = "button";
  btnToggle.className = "btn-icon";
  btnToggle.id = "btn-secret-toggle";
  btnToggle.setAttribute("aria-label", t("btnShowSecret"));
  btnToggle.setAttribute("aria-pressed", "false");
  btnToggle.innerHTML = eyeOpenIcon();
  btnToggle.addEventListener("click", () => {
    secretVisible = !secretVisible;
    if (secretVisible && currentSecretKeyHex) {
      secretValueEl.textContent = currentSecretKeyHex;
      btnToggle.innerHTML = eyeClosedIcon();
      btnToggle.setAttribute("aria-label", t("btnHideSecret"));
      btnToggle.setAttribute("aria-pressed", "true");
    } else {
      secretValueEl.textContent = t("secretMasked");
      btnToggle.innerHTML = eyeOpenIcon();
      btnToggle.setAttribute("aria-label", t("btnShowSecret"));
      btnToggle.setAttribute("aria-pressed", "false");
    }
  });

  // 「コピー」ボタン
  const btnCopy = document.createElement("button");
  btnCopy.type = "button";
  btnCopy.className = "btn-icon";
  btnCopy.setAttribute("aria-label", t("btnCopySecret"));
  btnCopy.innerHTML = copyIcon();
  btnCopy.addEventListener("click", () => {
    if (currentSecretKeyHex) {
      // Secret をクリップボードへコピー (console/storage/URL へは送らない)
      void copyToClipboard(currentSecretKeyHex);
    }
  });

  controls.appendChild(btnToggle);
  controls.appendChild(btnCopy);

  secretRow.appendChild(secretValueEl);
  secretRow.appendChild(controls);
  secretCard.appendChild(secretLabel);
  secretCard.appendChild(secretRow);
  container.appendChild(secretCard);

  // --- UUID カード ---
  if (deviceInfo.uuidString) {
    const uuidCard = createCard(
      t("labelUuid"),
      `<span class="card-value mono">${escapeHtml(deviceInfo.uuidString)}</span>`,
      false,
    );
    container.appendChild(uuidCard);
  }

  // --- Public Key カード (折りたたみ) ---
  if (deviceInfo.publicKey.length > 0) {
    const pubKeyHex = Array.from(deviceInfo.publicKey)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const pubKeyCard = createCard(
      t("labelPublicKey"),
      `<span class="card-value mono" style="font-size:0.75rem;opacity:0.7">${escapeHtml(pubKeyHex)}</span>`,
      false,
    );
    container.appendChild(pubKeyCard);
  }

  // --- Key Index カード ---
  const keyIndexCard = createCard(
    t("labelKeyIndex"),
    `<span class="card-value mono">${deviceInfo.keyIndex}</span>`,
    false,
  );
  container.appendChild(keyIndexCard);

  // --- デコード方式カード ---
  const methodCard = createCard(
    t("labelDecodeMethod"),
    `<span class="card-value" style="font-size:0.85rem;color:var(--color-text-3)">${escapeHtml(decodeStage)}</span>`,
    false,
  );
  container.appendChild(methodCard);
}

/** 汎用カードを生成する */
function createCard(
  label: string,
  contentHtml: string,
  _highlight: boolean,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "result-card";

  const labelEl = document.createElement("div");
  labelEl.className = "card-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("div");
  valueEl.innerHTML = contentHtml;

  card.appendChild(labelEl);
  card.appendChild(valueEl);
  return card;
}

/** 結果をクリアしてメモリからSecretを削除する */
export function clearResult(): void {
  currentSecretKeyHex = null;
  secretVisible = false;
  const container = document.getElementById("result-cards");
  if (container) container.innerHTML = "";
}

// ---- SVGアイコン ----

function eyeOpenIcon(): string {
  return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill="currentColor"/>
    <path fill-rule="evenodd" clip-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.18A9.99 9.99 0 0110 4c3.36 0 6.35 1.64 8.338 4.18a.75.75 0 010 1.64C16.35 12.36 13.36 14 10 14A9.99 9.99 0 01.664 10.59zm5.336-.09a4 4 0 118 0 4 4 0 01-8 0z" fill="currentColor"/>
  </svg>`;
}

function eyeClosedIcon(): string {
  return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38 1.651 1.651 0 000-1.18A10.004 10.004 0 009.999 3a9.956 9.956 0 00-4.744 1.194L3.28 2.22zm7.752 7.752l-3.004-3.004a4 4 0 015.257 5.257l-2.253-2.253zM4.5 10a5.5 5.5 0 007.548 5.108l-2.36-2.36A2.5 2.5 0 017.15 9.9L4.5 7.25A5.5 5.5 0 004.5 10z" fill="currentColor"/>
    <path d="M10 3.5c-.71 0-1.4.08-2.06.22l-1.12-1.12A9.957 9.957 0 0110 2c3.36 0 6.35 1.64 8.338 4.18a1.651 1.651 0 010 1.64c-.64.873-1.41 1.64-2.27 2.26l-1.46-1.46A5.5 5.5 0 0010 3.5z" fill="currentColor"/>
  </svg>`;
}

function copyIcon(): string {
  return `<svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" fill="currentColor"/>
    <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" fill="currentColor"/>
  </svg>`;
}

/** XSS防止のため HTML エスケープを行う */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
