import { AIConfigManager, type AIConfiguration } from './aiConfig';

// Provider-agnostic chat client. This is the AI backbone every gameplay
// feature (NPC dialogue, the AI Director, personalized missions) calls into.
// It routes a single chat request to whichever provider the player configured
// (OpenAI / Hugging Face router / Anthropic / a local OpenAI-compatible server
// such as Ollama) and returns plain text or parsed JSON. When no provider is
// usable it returns null so callers fall back to their hand-authored content —
// the game must stay fully playable offline.

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  // A hint that the response should be a single JSON object. Providers that
  // support a native JSON mode use it; others get an instruction appended.
  json?: boolean;
}

// OpenAI-compatible chat endpoints keyed by provider id.
const CHAT_ENDPOINTS: Record<string, string> = {
  xai: 'https://api.x.ai/v1/chat/completions',
  openai: 'https://api.openai.com/v1/chat/completions',
  huggingface: 'https://router.huggingface.co/v1/chat/completions',
  local: 'http://localhost:11434/v1/chat/completions',
};

class LLMClient {
  // True when the active configuration can actually reach a model.
  isConfigured(): boolean {
    const cfg = AIConfigManager.getConfiguration();
    const provider = AIConfigManager.getProvider(cfg.providerId);
    if (!provider) return false;
    if (provider.requiresApiKey) return Boolean(cfg.apiKey?.trim());
    // Local/custom only needs an endpoint (its own default is fine).
    return true;
  }

  // Returns generated text, or null if the request could not be completed.
  async complete(
    system: string,
    user: string,
    opts: LLMOptions = {}
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;
    const cfg = AIConfigManager.getConfiguration();
    try {
      if (cfg.providerId === 'anthropic') {
        return await this.callAnthropic(cfg, system, user, opts);
      }
      return await this.callOpenAICompatible(cfg, system, user, opts);
    } catch (error) {
      console.warn('[llmClient] completion failed, using fallback:', error);
      return null;
    }
  }

  // Convenience wrapper that asks for and parses a JSON object.
  async completeJSON<T>(
    system: string,
    user: string,
    opts: LLMOptions = {}
  ): Promise<T | null> {
    const text = await this.complete(system, user, { ...opts, json: true });
    if (!text) return null;
    return this.extractJSON<T>(text);
  }

  private buildParams(cfg: AIConfiguration, opts: LLMOptions) {
    return {
      temperature: opts.temperature ?? cfg.parameters.temperature,
      max_tokens: opts.maxTokens ?? cfg.parameters.maxTokens,
      top_p: cfg.parameters.topP,
    };
  }

  private async callOpenAICompatible(
    cfg: AIConfiguration,
    system: string,
    user: string,
    opts: LLMOptions
  ): Promise<string | null> {
    const endpoint =
      cfg.customEndpoint?.trim() || CHAT_ENDPOINTS[cfg.providerId];
    if (!endpoint) return null;

    const params = this.buildParams(cfg, opts);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (cfg.apiKey?.trim())
      headers.Authorization = `Bearer ${cfg.apiKey.trim()}`;

    const body: Record<string, unknown> = {
      model: cfg.modelId,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      ...params,
    };
    if (opts.json) body.response_format = { type: 'json_object' };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${cfg.providerId} HTTP ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() ?? null;
  }

  private async callAnthropic(
    cfg: AIConfiguration,
    system: string,
    user: string,
    opts: LLMOptions
  ): Promise<string | null> {
    const params = this.buildParams(cfg, opts);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.modelId,
        system,
        max_tokens: params.max_tokens,
        temperature: params.temperature,
        messages: [{ role: 'user', content: user }],
      }),
    });
    if (!res.ok) throw new Error(`anthropic HTTP ${res.status}`);
    const data = await res.json();
    return data?.content?.[0]?.text?.trim() ?? null;
  }

  // Tolerant JSON extraction: strips markdown fences and grabs the first
  // balanced object so a slightly chatty model still parses.
  private extractJSON<T>(text: string): T | null {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    } catch {
      return null;
    }
  }
}

export const llmClient = new LLMClient();
