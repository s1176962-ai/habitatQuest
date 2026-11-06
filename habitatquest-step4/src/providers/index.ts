import type { ProviderAdapter, ProviderId } from '../types';
import { getConfig } from '../lib/storage';
import { localProvider } from './local';
import { createOpenAICompatible } from './openai-compatible';
import { geminiProvider } from './gemini';
import { customProvider } from './custom';

export const PROVIDERS: Record<ProviderId, ProviderAdapter> = {
  local: localProvider,
  'openai-compatible': createOpenAICompatible('openai-compatible'),
  gemini: geminiProvider,
  custom: customProvider,
};

/** Local channel always resolves to the offline adapter, regardless of preset. */
export function activeProviderId(): ProviderId {
  const c = getConfig();
  return c.channel === 'local' ? 'local' : (c.provider === 'local' ? 'openai-compatible' : c.provider);
}

export function getProvider(id?: ProviderId): ProviderAdapter {
  return PROVIDERS[id || activeProviderId()] || localProvider;
}

export function isApiChannel(): boolean { return getConfig().channel === 'api'; }

/** Some presets deliberately use the browser's built-in speech (still zero net). */
export function usesBrowserTTS(id: ProviderId = activeProviderId()): boolean {
  return id === 'local' || id === 'gemini';
}
