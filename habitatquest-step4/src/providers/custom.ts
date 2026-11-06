import type { ProviderAdapter } from '../types';
import { createOpenAICompatible } from './openai-compatible';

/**
 * "自定义" = user-supplied Base URL + model names, speaking the OpenAI
 * Chat Completions / audio / images REST shape. Editable in SettingsDrawer.
 */
export const customProvider: ProviderAdapter = createOpenAICompatible('custom');
