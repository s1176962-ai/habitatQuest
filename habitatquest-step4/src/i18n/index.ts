import { useSyncExternalStore } from 'react';
import type { I18nVars, Lang } from '../types';
import { getConfig } from '../lib/storage';
import { en } from './locales/en';
import { zh } from './locales/zh';

export type { Lang };

/**
 * Tiny dependency-free i18n store.
 *
 * Deliberately NOT React Context: quota.ts, network.ts, providers/* and the
 * scoring engine also need translated strings, and dynamic values (scores,
 * advice, request-log rows, chat notes) are stored as i18n keys so that
 * switching language updates text that has already been rendered.
 */
const DICTS: Record<Lang, Record<string, string>> = { en, zh };
const listeners = new Set<() => void>();

/**
 * English is the default, but the persisted choice is read at module load so
 * the very first React render (and the <html lang> / title) already matches.
 * App's useEffect later calls setLang() as a no-op safety sync.
 */
let current: Lang = getConfig().language === 'zh' ? 'zh' : 'en';

function syncDocument(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = current === 'zh' ? 'zh-CN' : 'en';
  document.title = t('app.title');
}
syncDocument();

export function getLang(): Lang { return current; }

export function setLang(next: Lang): void {
  if (next !== 'en' && next !== 'zh') return;
  if (next === current) return;
  current = next;
  syncDocument();
  listeners.forEach((fn) => fn());
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/** Translate a key. Unknown keys pass through unchanged (used by tr()). */
export function t(key: string, vars?: I18nVars): string {
  const raw: string = DICTS[current][key] ?? DICTS.en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name]));
}

/** Translate only when the value is a known key; otherwise return it verbatim. */
export function tr(value: string | undefined | null, vars?: I18nVars): string {
  if (!value) return '';
  return t(value, vars);
}

/** Turn a stored [{key, vars}] sequence into display text. */
export function renderPieces(pieces?: { key: string; vars?: I18nVars }[] | null): string {
  if (!pieces?.length) return '';
  return pieces.map((p) => t(p.key, p.vars)).join('');
}

/** React hook — subscribes the component so a language switch re-renders it. */
export function useI18n(): { lang: Lang; t: typeof t; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribeLang, getLang, getLang);
  return { lang, t, setLang };
}
