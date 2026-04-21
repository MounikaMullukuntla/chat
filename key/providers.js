/**
 * providers.js — Static provider + model registry
 * Kept in sync with chat/lib/db/migrations/0007_seed_data_model_config.sql
 * and chat/lib/storage/types.ts APIProvider type.
 */

window.KeyManagerProviders = [
  {
    id: 'google',
    name: 'Google',
    keyPlaceholder: 'AIza...',
    keyHint: 'Google AI Studio key',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Enhanced flash model with better performance', isDefault: true,  active: true  },
      { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   description: 'Most capable model for complex tasks',         isDefault: false, active: true  },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast, efficient model for most tasks',         isDefault: false, active: true  },
      { id: 'gemma-3',          name: 'Gemma 3',           description: 'Open source model for basic tasks',           isDefault: false, active: false },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    keyPlaceholder: 'sk-ant-...',
    keyHint: 'Anthropic Console key',
    getKeyUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Most capable Claude model',        isDefault: true,  active: true  },
      { id: 'claude-3-5-haiku-20241022',  name: 'Claude 3.5 Haiku',  description: 'Fast and efficient Claude model', isDefault: false, active: true  },
      { id: 'claude-3-opus-20240229',     name: 'Claude 3 Opus',     description: 'Previous generation flagship',    isDefault: false, active: false },
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyHint: 'OpenAI platform key',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-4o',      name: 'GPT-4o',      description: 'Most capable GPT-4 model',       isDefault: true,  active: true  },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster, more affordable GPT-4',  isDefault: false, active: true  },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation GPT-4',      isDefault: false, active: false },
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    keyPlaceholder: 'xai-...',
    keyHint: 'xAI Console key',
    getKeyUrl: 'https://console.x.ai/',
    models: [
      { id: 'grok-3',      name: 'Grok 3',      description: 'Most capable Grok model',  isDefault: true,  active: true },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Fast and efficient Grok',  isDefault: false, active: true },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    keyPlaceholder: 'gsk_...',
    keyHint: 'Groq Console key',
    getKeyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', description: 'Fast open-source model via Groq', isDefault: true, active: true },
    ],
  },
  {
    id: 'mistral',
    name: 'Mistral',
    keyPlaceholder: '',
    keyHint: 'Mistral platform key',
    getKeyUrl: 'https://console.mistral.ai/api-keys/',
    models: [
      { id: 'mistral-large-latest', name: 'Mistral Large', description: 'Most capable Mistral model', isDefault: true, active: true },
    ],
  },
  {
    id: 'together',
    name: 'Together AI',
    keyPlaceholder: '',
    keyHint: 'Together AI key',
    getKeyUrl: 'https://api.together.xyz/settings/api-keys',
    models: [],
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    keyPlaceholder: '',
    keyHint: 'Fireworks AI key',
    getKeyUrl: 'https://fireworks.ai/account/api-keys',
    models: [],
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    keyPlaceholder: 'pplx-...',
    keyHint: 'Perplexity API key',
    getKeyUrl: 'https://www.perplexity.ai/settings/api',
    models: [],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    keyPlaceholder: '',
    keyHint: 'DeepSeek platform key',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'DeepSeek V3 chat model', isDefault: true, active: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    keyPlaceholder: '',
    keyHint: 'Discord bot token (DISCORD_BOT_TOKEN)',
    getKeyUrl: 'https://discord.com/developers/applications',
    models: [],
  },
];
