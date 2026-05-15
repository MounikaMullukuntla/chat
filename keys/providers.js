/**
 * providers.js — Static provider + model registry (canonical source).
 *
 * Single source of truth for provider metadata used by:
 *   - Static pages via window.KeyManagerProviders (set when loaded as <script>)
 *   - chat/lib/providers.ts (imported via module.exports for Next.js app code)
 *   - requests/engine/js/app.js (reads window.KeyManagerProviders for model picker)
 *
 * Also kept in sync with lib/db/migrations/0007_seed_data_model_config.sql
 * and lib/storage/types.ts APIProvider type.
 *
 * outputs field (optional): non-text capabilities a model supports.
 * Text output is assumed for all models; only list 'image' and/or 'video' here.
 */

const _providers = [
  {
    id: 'github',
    name: 'GitHub',
    keyPlaceholder: 'ghp_... or github_pat_...',
    keyHint: 'Personal Access Token (GITHUB_PERSONAL_ACCESS_TOKEN)',
    getKeyUrl: 'https://github.com/settings/tokens',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'google',
    name: 'Google',
    keyPlaceholder: 'AIza...',
    keyHint: 'Google AI Studio key',
    getKeyUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Enhanced flash model with better performance', isDefault: true,  active: true,  supportsThinkingMode: true  },
      { id: 'gemini-2.5-pro',   name: 'Gemini 2.5 Pro',   description: 'Most capable model for complex tasks',         isDefault: false, active: true,  supportsThinkingMode: true  },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: 'Fast, efficient model for most tasks',         isDefault: false, active: true,  outputs: ['image'] },
      { id: 'gemma-3',          name: 'Gemma 3',           description: 'Open source model for basic tasks',           isDefault: false, active: true  },
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
      { id: 'gpt-4o',      name: 'GPT-4o',      description: 'Most capable GPT-4 model',      isDefault: true,  active: true,  outputs: ['image'] },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Faster, more affordable GPT-4', isDefault: false, active: true  },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Previous generation GPT-4',     isDefault: false, active: false },
    ],
  },
  {
    id: 'xai',
    name: 'xAI',
    keyPlaceholder: 'xai-...',
    keyHint: 'xAI Console key',
    getKeyUrl: 'https://console.x.ai/',
    models: [
      { id: 'grok-3',      name: 'Grok 3',      description: 'Most capable Grok model', isDefault: true,  active: true, outputs: ['image', 'video'] },
      { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Fast and efficient Grok', isDefault: false, active: true, outputs: ['image', 'video'] },
    ],
  },
  {
    id: 'groq',
    name: 'Groq',
    keyPlaceholder: 'gsk_...',
    keyHint: 'Groq Console key — free tier includes Whisper transcription (7,200 audio sec/hr)',
    getKeyUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'llama-3.3-70b-versatile',     name: 'Llama 3.3 70B',         description: 'Fast open-source model via Groq',                  isDefault: true,  active: true },
      { id: 'whisper-large-v3',            name: 'Whisper Large v3',       description: 'Free speech-to-text transcription, 99 languages',  isDefault: false, active: true },
      { id: 'whisper-large-v3-turbo',      name: 'Whisper Large v3 Turbo', description: 'Whisper at 216× real-time speed via Groq',         isDefault: false, active: true },
      { id: 'distil-whisper-large-v3-en',  name: 'Distil-Whisper v3 EN',   description: 'Lightweight English-only Whisper model',           isDefault: false, active: true },
    ],
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
    id: 'pollinations',
    name: 'Pollinations',
    keyPlaceholder: 'pol-...',
    keyHint: 'Pollinations API token (auth.pollinations.ai) for higher tiers',
    getKeyUrl: 'https://enter.pollinations.ai',
    models: [
      { id: 'flux',   name: 'Flux Schnell',  description: 'Fast Black Forest Labs Flux model', isDefault: true,  active: true, outputs: ['image'] },
      { id: 'zimage', name: 'Z-Image Turbo', description: 'Alibaba Z-Image Turbo',             isDefault: false, active: true, outputs: ['image'] },
    ],
  },
  {
    id: 'meshy',
    name: 'Meshy',
    keyPlaceholder: 'msy-...',
    keyHint: '100 free credits/month — Pro plan required for API access',
    getKeyUrl: 'https://www.meshy.ai/api',
    models: [
      { id: 'text-to-3d',        name: 'Text to 3D',         description: 'Generate 3D models from text prompts (meshy-6)',      isDefault: true,  active: true, outputs: ['3d'] },
      { id: 'image-to-3d',       name: 'Image to 3D',        description: 'Generate 3D models from a reference image',          isDefault: false, active: true, outputs: ['3d'] },
      { id: 'multiimage-to-3d',  name: 'Multi-Image to 3D',  description: 'Generate 3D from multiple reference images',         isDefault: false, active: true, outputs: ['3d'] },
      { id: 'ai-texturing',      name: 'AI Texturing',       description: 'Apply AI-generated textures to existing 3D meshes',  isDefault: false, active: true, outputs: ['3d'] },
    ],
  },
  {
    id: 'tripo',
    name: 'Tripo',
    keyPlaceholder: 'tsk_...',
    keyHint: '300 free credits/month (~24 models) — platform.tripo3d.ai',
    getKeyUrl: 'https://platform.tripo3d.ai/api-keys',
    models: [
      { id: 'v3.0',  name: 'Tripo v3.0',  description: 'Stable text/image-to-3D generation',             isDefault: true,  active: true, outputs: ['3d'] },
      { id: 'v3.1',  name: 'Tripo v3.1',  description: 'Enhanced quality 3D generation',                 isDefault: false, active: true, outputs: ['3d'] },
      { id: 'p1',    name: 'Tripo P1',    description: 'Premium game-ready 3D with higher fidelity',     isDefault: false, active: true, outputs: ['3d'] },
    ],
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    keyPlaceholder: '',
    keyHint: '10,000 free characters/month TTS — elevenlabs.io',
    getKeyUrl: 'https://elevenlabs.io/app/settings/api-keys',
    models: [
      { id: 'eleven_flash_v2_5',      name: 'Flash v2.5',          description: 'Fast TTS included in free tier',                  isDefault: true,  active: true, outputs: ['audio'] },
      { id: 'eleven_multilingual_v2', name: 'Multilingual v2',     description: 'High-quality TTS in 29+ languages',              isDefault: false, active: true, outputs: ['audio'] },
      { id: 'eleven_turbo_v2_5',      name: 'Turbo v2.5',          description: 'Low-latency TTS for real-time applications',     isDefault: false, active: true, outputs: ['audio'] },
      { id: 'scribe_v1',              name: 'Scribe v1 (STT)',      description: 'Accurate speech-to-text with speaker diarization', isDefault: false, active: true },
    ],
  },
  {
    id: 'discord',
    name: 'Discord Bot',
    keyPlaceholder: '',
    keyHint: 'Discord bot token (DISCORD_BOT_TOKEN)',
    getKeyUrl: 'https://discord.com/developers/applications',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'pinecone',
    name: 'Pinecone',
    keyPlaceholder: 'pcsk_...',
    keyHint: 'Vector DB for repository retrieval (PINECONE_API_KEY)',
    getKeyUrl: 'https://app.pinecone.io/organizations/-/keys',
    tokenOnly: true,
    models: [],
  },
  {
    id: 'voyage',
    name: 'Voyage AI',
    keyPlaceholder: 'pa-...',
    keyHint: 'Embedding model for repository retrieval (VOYAGE_API_KEY)',
    getKeyUrl: 'https://dash.voyageai.com/api-keys',
    tokenOnly: true,
    models: [],
  },
];

// Browser global (loaded via <script> tag)
if (typeof window !== 'undefined') window.KeyManagerProviders = _providers;

// Node.js / CommonJS (imported by chat/lib/providers.ts)
if (typeof module !== 'undefined' && module.exports) module.exports = _providers;

// CLI providers — shown only on localhost (no API key required)
if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  _providers.push(
    {
      id: 'claude-code-cli',
      name: 'Claude Code CLI',
      keyPlaceholder: '',
      keyHint: 'Local CLI — no API key required',
      getKeyUrl: 'https://claude.ai/download',
      cliOnly: true,
      models: [
        { id: 'claude-code', name: 'Claude Code', description: 'Claude Code CLI running locally', isDefault: true, active: true },
      ],
    },
    {
      id: 'codex-cli',
      name: 'Codex CLI',
      keyPlaceholder: '',
      keyHint: 'Local CLI — no API key required',
      getKeyUrl: 'https://github.com/openai/codex',
      cliOnly: true,
      models: [
        { id: 'codex', name: 'OpenAI Codex', description: 'OpenAI Codex CLI running locally', isDefault: true, active: true },
      ],
    }
  );
}
