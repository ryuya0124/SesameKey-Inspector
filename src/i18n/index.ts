/**
 * i18n — 言語管理モジュール
 *
 * 言語設定のみ localStorage に保存する。
 * Secret Key / QR内容 は絶対に保存しない。
 */

import { ja, type TranslationKey } from "./ja.ts";
import { en } from "./en.ts";

type Lang = "ja" | "en";
const STORAGE_KEY = "sesamekey_lang";

/** 翻訳テーブル一覧 */
const translations: Record<Lang, Record<string, string>> = { ja, en };

/** 現在の言語 */
let currentLang: Lang = detectInitialLang();

/**
 * 初期言語を決定する
 * 優先順位: localStorage → ブラウザ言語設定 → デフォルト(ja)
 */
function detectInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ja" || stored === "en") return stored;
  } catch {
    // プライベートモードなど localStorage が使えない環境では無視
  }

  const browserLang = navigator.language?.toLowerCase() ?? "";
  if (browserLang.startsWith("ja")) return "ja";
  return "en";
}

/**
 * 現在の言語でキーに対応する翻訳文字列を返す
 * {stage} などのプレースホルダーがある場合は values で置換する
 */
export function t(key: TranslationKey, values?: Record<string, string>): string {
  const text = translations[currentLang][key] as string;
  if (!values) return text;

  return Object.entries(values).reduce(
    (acc, [k, v]) => acc.replace(`{${k}}`, v),
    text,
  );
}

/** 現在の言語を取得する */
export function getLang(): Lang {
  return currentLang;
}

/** 言語を切り替えて全テキストを更新する */
export function setLang(lang: Lang): void {
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // localStorage 不可環境は無視
  }

  // HTML の lang 属性を更新
  document.documentElement.lang = lang;

  // 翻訳対象の全要素を更新
  document
    .querySelectorAll<HTMLElement>("[data-i18n]")
    .forEach((el) => {
      const key = el.dataset.i18n!;
      if (key in ja) {
        el.textContent = t(key as TranslationKey);
      }
    });

  // placeholder の更新
  document
    .querySelectorAll<HTMLElement>("[data-i18n-placeholder]")
    .forEach((el) => {
      const key = el.dataset.i18nPlaceholder as TranslationKey;
      if (el instanceof HTMLInputElement && key in translations.ja) {
        el.placeholder = t(key);
      }
    });

  // aria-label の更新
  document
    .querySelectorAll<HTMLElement>("[data-i18n-aria]")
    .forEach((el) => {
      const key = el.dataset.i18nAria!;
      if (key in ja) {
        el.setAttribute("aria-label", t(key as TranslationKey));
      }
    });
}

/** 言語をトグルする (ja ↔ en) */
export function toggleLang(): void {
  setLang(currentLang === "ja" ? "en" : "ja");
}
