import React, { useState, useEffect } from 'react';
import { AI_PROVIDERS, AIConfigManager, AIConfiguration, AIProvider, AIModel } from '../lib/aiConfig';

interface AIConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChange?: (config: AIConfiguration) => void;
}

const AIConfigPanel: React.FC<AIConfigPanelProps> = ({ isOpen, onClose, onConfigChange }) => {
  const [config, setConfig] = useState<AIConfiguration>(AIConfigManager.getConfiguration());
  const [selectedProvider, setSelectedProvider] = useState<AIProvider | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    const provider = AI_PROVIDERS.find(p => p.id === config.providerId);
    const model = provider?.models.find(m => m.id === config.modelId);
    setSelectedProvider(provider || null);
    setSelectedModel(model || null);
  }, [config.providerId, config.modelId]);

  const handleProviderChange = (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      const firstModel = provider.models[0];
      const newConfig = {
        ...config,
        providerId,
        modelId: firstModel.id,
        apiKey: config.providerId === providerId ? config.apiKey : ''
      };
      setConfig(newConfig);
    }
  };

  const handleModelChange = (modelId: string) => {
    setConfig({ ...config, modelId });
  };

  const handleApiKeyChange = (apiKey: string) => {
    setConfig({ ...config, apiKey });
  };

  const handleParameterChange = (key: keyof AIConfiguration['parameters'], value: number) => {
    setConfig({
      ...config,
      parameters: { ...config.parameters, [key]: value }
    });
  };

  const handleSave = () => {
    const validation = AIConfigManager.validateConfiguration(config);
    if (validation.valid) {
      AIConfigManager.saveConfiguration(config);
      onConfigChange?.(config);
      setTestMessage('Configuration saved successfully!');
      setTimeout(() => setTestMessage(''), 3000);
    } else {
      setTestMessage(`Error: ${validation.errors.join(', ')}`);
    }
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('Testing AI connection...');
    
    try {
      // Simulate API test - in real implementation, this would test the actual API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (config.apiKey || !selectedProvider?.requiresApiKey) {
        setTestStatus('success');
        setTestMessage('✅ Connection successful!');
      } else {
        setTestStatus('error');
        setTestMessage('❌ API key required');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('❌ Connection failed');
    }
    
    setTimeout(() => {
      setTestStatus('idle');
      setTestMessage('');
    }, 3000);
  };

  const handleReset = () => {
    AIConfigManager.resetToDefaults();
    setConfig(AIConfigManager.getConfiguration());
    setTestMessage('Configuration reset to defaults');
    setTimeout(() => setTestMessage(''), 3000);
  };

  const getCostColor = (level: string) => {
    switch (level) {
      case 'free': return 'text-green-400';
      case 'low': return 'text-yellow-400';
      case 'medium': return 'text-orange-400';
      case 'high': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-purple-900/90 to-black border-2 border-purple-500 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-purple-500/30">
          <div>
            <h2 className="text-2xl font-bold text-purple-400">🤖 AI Configuration</h2>
            <p className="text-gray-400 text-sm">Configure your AI provider and model settings</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Provider Selection */}
          <div>
            <label className="block text-white font-semibold mb-3">AI Provider</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AI_PROVIDERS.map(provider => (
                <div
                  key={provider.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    config.providerId === provider.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-gray-600 bg-gray-800/50 hover:border-purple-400'
                  }`}
                  onClick={() => handleProviderChange(provider.id)}
                >
                  <div className="font-semibold text-white">{provider.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{provider.description}</div>
                  <div className="text-xs text-purple-400 mt-2">
                    {provider.models.length} models available
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Selection */}
          {selectedProvider && (
            <div>
              <label className="block text-white font-semibold mb-3">Model</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedProvider.models.map(model => (
                  <div
                    key={model.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      config.modelId === model.id
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-gray-600 bg-gray-800/50 hover:border-purple-400'
                    }`}
                    onClick={() => handleModelChange(model.id)}
                  >
                    <div className="font-semibold text-white text-sm">{model.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{model.description}</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{model.maxTokens} tokens</span>
                      <span className={`text-xs font-semibold ${getCostColor(model.costLevel)}`}>
                        {model.costLevel.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* API Key */}
          {selectedProvider?.requiresApiKey && (
            <div>
              <label className="block text-white font-semibold mb-2">API Key</label>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder={`Enter your ${selectedProvider.name} API key`}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-white"
                  >
                    {showApiKey ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  Get your API key from{' '}
                  <a
                    href={selectedProvider.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    {selectedProvider.website}
                  </a>
                </div>
                <div className="text-xs text-yellow-400 bg-yellow-400/10 p-2 rounded">
                  💡 {selectedProvider.setupInstructions}
                </div>
              </div>
            </div>
          )}

          {/* Parameters */}
          <div>
            <label className="block text-white font-semibold mb-3">Model Parameters</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Temperature</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.parameters.temperature}
                  onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {config.parameters.temperature} (Creativity)
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Max Tokens</label>
                <input
                  type="range"
                  min="10"
                  max={selectedModel?.maxTokens || 1000}
                  step="10"
                  value={config.parameters.maxTokens}
                  onChange={(e) => handleParameterChange('maxTokens', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {config.parameters.maxTokens} tokens
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Top P</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={config.parameters.topP}
                  onChange={(e) => handleParameterChange('topP', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {config.parameters.topP} (Focus)
                </div>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {testMessage && (
            <div className={`p-3 rounded text-center ${
              testStatus === 'success' ? 'bg-green-500/20 text-green-400' :
              testStatus === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {testMessage}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-purple-500/30">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded font-semibold"
            >
              {testStatus === 'testing' ? '🔄 Testing...' : '🧪 Test Connection'}
            </button>
            <button
              onClick={handleSave}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded font-semibold"
            >
              💾 Save Configuration
            </button>
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded font-semibold"
            >
              🔄 Reset to Defaults
            </button>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold ml-auto"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfigPanel;

