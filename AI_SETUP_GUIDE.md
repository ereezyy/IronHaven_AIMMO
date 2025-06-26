# 🤖 AI Configuration Guide for IronHaven AIMMO

## Quick Setup

IronHaven AIMMO supports multiple AI providers. Choose your preferred option:

### Option 1: Use the Built-in AI Settings Panel (Recommended)
1. **Launch the game** at https://coarnwjj.manus.space
2. **Click the "⚙️ AI Settings" button** in the top-right AI status widget
3. **Select your preferred AI provider** (Hugging Face, OpenAI, Anthropic, etc.)
4. **Enter your API key** and choose a model
5. **Click "Test Connection"** to verify it works
6. **Save Configuration** - your settings are stored locally

### Option 2: Environment Variables (For Developers)
Create a `.env` file in the project root:

```bash
# Hugging Face (Free tier available)
VITE_HUGGING_FACE_TOKEN=your_token_here

# OpenAI (Premium)
VITE_OPENAI_API_KEY=your_key_here

# Anthropic (Premium)
VITE_ANTHROPIC_API_KEY=your_key_here
```

## Supported AI Providers

### 🤗 Hugging Face (Recommended for Free Users)
- **Website**: https://huggingface.co
- **Free Tier**: Yes
- **Setup**: Get token from https://huggingface.co/settings/tokens
- **Models**: GPT-2, DialoGPT, BlenderBot
- **Best For**: Free experimentation, open-source models

### 🧠 OpenAI (Premium Quality)
- **Website**: https://platform.openai.com
- **Free Tier**: Limited credits
- **Setup**: Get API key from https://platform.openai.com/api-keys
- **Models**: GPT-3.5 Turbo, GPT-4, GPT-4 Turbo
- **Best For**: High-quality responses, advanced features

### 🎭 Anthropic (Safety-Focused)
- **Website**: https://console.anthropic.com
- **Free Tier**: Limited credits
- **Setup**: Get API key from console.anthropic.com
- **Models**: Claude 3 Haiku, Sonnet, Opus
- **Best For**: Safe, helpful, and honest AI responses

### 🏠 Local/Custom (Advanced Users)
- **Setup**: Run Ollama or custom AI server
- **Models**: Llama 2, Mistral, custom models
- **Best For**: Privacy, no API costs, custom models

## Model Recommendations

### For Gaming/Roleplay:
- **Hugging Face**: DialoGPT Medium (free, good for NPCs)
- **OpenAI**: GPT-3.5 Turbo (balanced cost/quality)
- **Anthropic**: Claude 3 Haiku (fast, creative)

### For High Quality:
- **OpenAI**: GPT-4 Turbo (best overall)
- **Anthropic**: Claude 3 Opus (most capable)

### For Free Usage:
- **Hugging Face**: GPT-2 or DialoGPT (completely free)
- **Local**: Ollama with Llama 2 (free, runs locally)

## Troubleshooting

### "AI Offline" Status
1. Check your API key is correct
2. Verify you have credits/quota remaining
3. Try a different model
4. Check the browser console for error details

### "Connection Failed"
1. Check your internet connection
2. Verify the API service is online
3. Try switching to a different provider
4. Check for CORS issues (use HTTPS)

### Poor AI Responses
1. Adjust temperature (0.7-0.9 for creativity)
2. Increase max tokens for longer responses
3. Try a different model
4. Check the model is appropriate for dialogue

## Security Notes

- **API keys are stored locally** in your browser
- **Keys are never sent to our servers**
- **Use environment variables** for production deployments
- **Rotate your API keys** regularly for security

## Cost Management

### Free Options:
- Hugging Face (completely free)
- OpenAI free tier (limited)
- Local models with Ollama

### Paid Options:
- OpenAI: ~$0.002 per 1K tokens (GPT-3.5)
- Anthropic: ~$0.003 per 1K tokens (Claude 3 Haiku)
- Costs are very low for gaming usage

## Support

For issues or questions:
1. Check the AI Settings panel for error messages
2. Look at browser console for technical details
3. Try the built-in connection test
4. Switch to a different provider as backup

**Happy Gaming with AI! 🎮🤖**

