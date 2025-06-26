export interface AIProvider {
  id: string;
  name: string;
  description: string;
  models: AIModel[];
  requiresApiKey: boolean;
  website: string;
  setupInstructions: string;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  type: 'text-generation' | 'chat' | 'dialogue';
  maxTokens: number;
  costLevel: 'free' | 'low' | 'medium' | 'high';
}

export interface AIConfiguration {
  providerId: string;
  modelId: string;
  apiKey: string;
  customEndpoint?: string;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
  };
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'huggingface',
    name: 'Hugging Face',
    description: 'Open-source AI models with free tier',
    requiresApiKey: true,
    website: 'https://huggingface.co',
    setupInstructions: 'Get your free API key from huggingface.co/settings/tokens',
    models: [
      {
        id: 'gpt2',
        name: 'GPT-2',
        description: 'Fast, reliable text generation',
        type: 'text-generation',
        maxTokens: 1024,
        costLevel: 'free'
      },
      {
        id: 'microsoft/DialoGPT-medium',
        name: 'DialoGPT Medium',
        description: 'Conversational AI optimized for dialogue',
        type: 'dialogue',
        maxTokens: 512,
        costLevel: 'free'
      },
      {
        id: 'microsoft/DialoGPT-large',
        name: 'DialoGPT Large',
        description: 'Advanced conversational AI',
        type: 'dialogue',
        maxTokens: 512,
        costLevel: 'low'
      },
      {
        id: 'facebook/blenderbot-400M-distill',
        name: 'BlenderBot',
        description: 'Facebook\'s conversational AI',
        type: 'chat',
        maxTokens: 256,
        costLevel: 'free'
      }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Premium AI models (GPT-3.5, GPT-4)',
    requiresApiKey: true,
    website: 'https://platform.openai.com',
    setupInstructions: 'Get your API key from platform.openai.com/api-keys',
    models: [
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fast and capable for most tasks',
        type: 'chat',
        maxTokens: 4096,
        costLevel: 'low'
      },
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model for complex tasks',
        type: 'chat',
        maxTokens: 8192,
        costLevel: 'high'
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Latest GPT-4 with improved performance',
        type: 'chat',
        maxTokens: 128000,
        costLevel: 'medium'
      }
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI models focused on safety',
    requiresApiKey: true,
    website: 'https://console.anthropic.com',
    setupInstructions: 'Get your API key from console.anthropic.com',
    models: [
      {
        id: 'claude-3-haiku',
        name: 'Claude 3 Haiku',
        description: 'Fast and efficient for simple tasks',
        type: 'chat',
        maxTokens: 200000,
        costLevel: 'low'
      },
      {
        id: 'claude-3-sonnet',
        name: 'Claude 3 Sonnet',
        description: 'Balanced performance and capability',
        type: 'chat',
        maxTokens: 200000,
        costLevel: 'medium'
      },
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        description: 'Most capable Claude model',
        type: 'chat',
        maxTokens: 200000,
        costLevel: 'high'
      }
    ]
  },
  {
    id: 'local',
    name: 'Local/Custom',
    description: 'Use your own local AI server or custom endpoint',
    requiresApiKey: false,
    website: 'https://ollama.ai',
    setupInstructions: 'Set up Ollama or your custom AI server endpoint',
    models: [
      {
        id: 'llama2',
        name: 'Llama 2',
        description: 'Meta\'s open-source model',
        type: 'text-generation',
        maxTokens: 4096,
        costLevel: 'free'
      },
      {
        id: 'mistral',
        name: 'Mistral 7B',
        description: 'Efficient open-source model',
        type: 'text-generation',
        maxTokens: 8192,
        costLevel: 'free'
      },
      {
        id: 'custom',
        name: 'Custom Model',
        description: 'Your own model endpoint',
        type: 'text-generation',
        maxTokens: 2048,
        costLevel: 'free'
      }
    ]
  }
];

export class AIConfigManager {
  private static readonly STORAGE_KEY = 'ironhaven-ai-config';
  private static readonly DEFAULT_CONFIG: AIConfiguration = {
    providerId: 'huggingface',
    modelId: 'gpt2',
    apiKey: '',
    parameters: {
      temperature: 0.8,
      maxTokens: 100,
      topP: 0.9
    }
  };

  static getConfiguration(): AIConfiguration {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const config = JSON.parse(stored);
        return { ...this.DEFAULT_CONFIG, ...config };
      }
    } catch (error) {
      console.warn('Failed to load AI configuration:', error);
    }
    return { ...this.DEFAULT_CONFIG };
  }

  static saveConfiguration(config: AIConfiguration): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
      console.log('AI configuration saved successfully');
    } catch (error) {
      console.error('Failed to save AI configuration:', error);
    }
  }

  static getProvider(providerId: string): AIProvider | undefined {
    return AI_PROVIDERS.find(p => p.id === providerId);
  }

  static getModel(providerId: string, modelId: string): AIModel | undefined {
    const provider = this.getProvider(providerId);
    return provider?.models.find(m => m.id === modelId);
  }

  static validateConfiguration(config: AIConfiguration): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const provider = this.getProvider(config.providerId);
    if (!provider) {
      errors.push('Invalid AI provider selected');
      return { valid: false, errors };
    }

    const model = this.getModel(config.providerId, config.modelId);
    if (!model) {
      errors.push('Invalid model selected for this provider');
    }

    if (provider.requiresApiKey && !config.apiKey.trim()) {
      errors.push(`API key required for ${provider.name}`);
    }

    if (config.parameters.temperature < 0 || config.parameters.temperature > 2) {
      errors.push('Temperature must be between 0 and 2');
    }

    if (config.parameters.maxTokens < 1 || config.parameters.maxTokens > 4096) {
      errors.push('Max tokens must be between 1 and 4096');
    }

    return { valid: errors.length === 0, errors };
  }

  static exportConfiguration(): string {
    const config = this.getConfiguration();
    // Remove sensitive data for export
    const exportConfig = { ...config, apiKey: '[REDACTED]' };
    return JSON.stringify(exportConfig, null, 2);
  }

  static importConfiguration(configJson: string): { success: boolean; error?: string } {
    try {
      const config = JSON.parse(configJson);
      const validation = this.validateConfiguration(config);
      
      if (!validation.valid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      this.saveConfiguration(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Invalid configuration format' };
    }
  }

  static resetToDefaults(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('AI configuration reset to defaults');
  }
}

